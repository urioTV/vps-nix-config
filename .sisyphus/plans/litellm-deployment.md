# Wdrożenie LiteLLM na Kubernetes (Pulumi)

## TL;DR

> **Quick Summary**: Deploy LiteLLM (LLM proxy + UI dashboard) on K3s cluster using Pulumi. PostgreSQL database for full features (UI model management, rate-limiting, usage tracking), NodePort external access (port 30001), master key authentication.
> 
> **Deliverables**:
> - `pulumi/kubernetes/litellm.ts` - LiteLLM deployment factory
> - `pulumi/kubernetes/litellm-postgres.ts` - PostgreSQL deployment factory
> - K8s resources: 2x Deployments, 2x PVCs, 2x Secrets, 3x Services
> - Static ClusterIP: `10.43.200.207` (LiteLLM only - for Tailscale access)
> - PostgreSQL uses regular ClusterIP (internal only)
> - NodePort `30001` for external access
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Secrets → PostgreSQL → LiteLLM → Services

---

## Context

### Original Request
User wants to deploy LiteLLM on their K3s Kubernetes cluster via Pulumi. LiteLLM is a unified API proxy for various LLM providers (OpenAI, Anthropic, Azure, etc.) with a management UI.

### Interview Summary
**Key Discussions**:
- **Modele LLM**: Configure later through UI dashboard (not in Pulumi code)
- **External access**: NodePort (port 30001) without Cloudflare Tunnel - secured by master key
- **UI Dashboard**: Included (LiteLLM runs proxy + UI on same port 4000)
- **Database**: PostgreSQL 16 on Longhorn PVC (5Gi) - **CRITICAL**: SQLite not officially supported
- **Resources**: Low (100m CPU, 256Mi RAM for LiteLLM, 100m CPU, 256Mi RAM for PostgreSQL)

**Research Findings**:
- Pattern: Follow `syncthing.ts` - dual service approach (ClusterIP + NodePort)
- Static IPs managed in `networking.ts`
- Secrets always via `loadSecrets()` from SOPS
- Images centralized in `image-versions-manifest.json`

### Metis Review
**Identified Gaps** (addressed):
- **Database**: Use PostgreSQL 16 (SQLite not officially supported by LiteLLM)
- **Secret injection**: Use `secretKeyRef`, never plain env vars
- **Env vars required**:
  - `DATABASE_URL` - PostgreSQL connection string
  - `LITELLM_MASTER_KEY` - Must start with `sk-`
  - `LITELLM_SALT_KEY` - For encrypting LLM API credentials
  - `STORE_MODEL_IN_DB=True` - Enable model management via UI
- **Image**: `ghcr.io/berriai/litellm:main-v1.81.12-stable.2`

---

## Work Objectives

### Core Objective
Deploy LiteLLM as a Kubernetes workload accessible:
- Internally via Tailscale: `http://10.43.200.207:4000`
- Externally via NodePort: `http://<vps-ip>:30001`

### Concrete Deliverables
1. `pulumi/kubernetes/litellm.ts` - Factory function `deployLiteLLM()`
2. `pulumi/kubernetes/litellm-postgres.ts` - Factory function `deployLiteLLMPostgres()`
3. Kubernetes namespace `litellm`
4. PersistentVolumeClaim `litellm-postgres-pvc` (5Gi, Longhorn) - PostgreSQL data
5. Kubernetes Secret `litellm-postgres-secrets` (DB credentials from SOPS)
6. Kubernetes Secret `litellm-secrets` (master key, salt key from SOPS)
7. Deployment `litellm-postgres` (1 replica, PostgreSQL 16)
8. Deployment `litellm` (1 replica, connects to PostgreSQL)
9. Service `litellm-postgres` (regular ClusterIP, port 5432 - internal only)
10. Service `litellm` (static ClusterIP 10.43.200.207:4000 - Tailscale access)
11. Service `litellm-external` (NodePort 30001 - external access)
12. Updates to: `networking.ts`, `namespaces.ts`, `sops.ts`, `index.ts`, `image-versions-manifest.json`

### Definition of Done
- [ ] `pulumi preview` shows no errors
- [ ] `pulumi up` succeeds
- [ ] PostgreSQL pod reaches `Running` state
- [ ] PostgreSQL PVC is `Bound`
- [ ] LiteLLM pod reaches `Running` state
- [ ] LiteLLM connects to PostgreSQL successfully
- [ ] ClusterIP accessible from Tailscale network
- [ ] NodePort accessible from external IP
- [ ] LiteLLM UI loads at `http://<vps-ip>:30001`
- [ ] Master key authentication works
- [ ] Can add model through UI

### Must Have
- PostgreSQL 16 persistence on Longhorn PVC
- Database credentials secured via SOPS
- LiteLLM connected to PostgreSQL via internal service
- Master key + salt key authentication
- Static ClusterIP for stable internal access
- NodePort for external access (no Cloudflare)
- `STORE_MODEL_IN_DB=True` for UI model management

### Must NOT Have (Guardrails)
- **NO Cloudflare Tunnel** - User wants direct access secured by master key
- **NO model/provider pre-configuration** - Will be done through UI later
- **NO HPA or replicas > 1** - Single replica for simplicity
- **NO plain-text secrets in Deployment spec** - Must use K8s Secret + secretKeyRef
- **NO Ingress resource** - Using NodePort only
- **NO SQLite** - Use PostgreSQL as officially supported

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO (Pulumi project, not application code)
- **Automated tests**: NO (infrastructure validation via QA scenarios)
- **Framework**: N/A
- **Agent-Executed QA**: ALWAYS (mandatory for all tasks)

### QA Policy
Every task includes agent-executed QA scenarios using:
- **CLI/Infrastructure**: Bash (kubectl) — Check pod status, PVC binding, service endpoints
- **API/Backend**: Bash (curl) — Test health endpoint, API authentication

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — configuration + secrets):
├── Task 1: Add ClusterIPs to networking.ts [quick]
├── Task 2: Add namespace to namespaces.ts [quick]
├── Task 3: Add images to image-versions-manifest.json [quick]
├── Task 4: Add secrets to sops.ts SecretsConfig [quick]
└── Task 5: Add secrets to secrets.yaml [quick]

Wave 2 (After Wave 1 — deployment factories):
├── Task 6: Create litellm-postgres.ts factory [deep]
└── Task 7: Create litellm.ts factory [deep]

Wave 3 (After Wave 2 — wiring):
├── Task 8: Export from kubernetes/index.ts [quick]
└── Task 9: Wire in pulumi/index.ts [quick]

Wave 4 (After Wave 3 — verification):
├── Task 10: Pulumi preview validation [quick]
└── Task 11: Deploy and verify [unspecified-high]

Critical Path: T1-T5 → T6 → T7 → T8-T9 → T10-T11
Parallel Speedup: ~40% faster than sequential
Max Concurrent: 5 (Wave 1)
```

### Dependency Matrix

| Task | Blocked By | Blocks |
|------|------------|--------|
| 1-5 | — | 6, 7 |
| 6 | 1, 2, 3, 4, 5 | 8 |
| 7 | 1, 2, 3, 4, 5, 6 | 8 |
| 8 | 6, 7 | 9 |
| 9 | 8 | 10 |
| 10 | 9 | 11 |
| 11 | 10 | — |

### Agent Dispatch Summary

- **Wave 1**: **5 quick** — T1-T5 all trivial single-file edits
- **Wave 2**: **2 deep** — T6 PostgreSQL factory, T7 LiteLLM factory
- **Wave 3**: **2 quick** — T8-T9 simple exports and wiring
- **Wave 4**: **1 quick + 1 unspecified-high** — T10 preview, T11 full deployment + verification

---

## TODOs

- [ ] 1. Add ClusterIP to networking.ts

  **What to do**:
  - Add `litellm: "10.43.200.207"` to `serviceIPs` object
  - **NOTE**: PostgreSQL does NOT need static IP - uses regular ClusterIP

  **Must NOT do**:
  - Do NOT modify existing IPs
  - Do NOT add litellm-postgres to serviceIPs

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-line addition to existing object
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: Task 6, 7
  - **Blocked By**: None

  **References**:
  - `pulumi/kubernetes/networking.ts:7-16` - Existing serviceIPs pattern

  **Acceptance Criteria**:
  - [ ] `litellm` key exists in serviceIPs with value "10.43.200.207"
  - [ ] TypeScript compiles without errors

  **QA Scenarios**:
  ```
  Scenario: Verify ClusterIP added
    Tool: Bash
    Steps:
      1. grep -q '"litellm": "10.43.200.207"' pulumi/kubernetes/networking.ts
    Expected Result: grep returns exit code 0
    Evidence: .sisyphus/evidence/task-1-networking-ip.txt
  ```

  **Commit**: NO (groups with Wave 1)

---

- [ ] 2. Add namespace to namespaces.ts

  **What to do**:
  - Add `litellm` namespace definition following existing pattern

  **Must NOT do**:
  - Do NOT add extra labels or annotations beyond pattern

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single namespace addition
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: Task 6, 7
  - **Blocked By**: None

  **References**:
  - `pulumi/kubernetes/namespaces.ts` - Existing namespace pattern

  **Acceptance Criteria**:
  - [ ] Namespace `litellm` defined
  - [ ] TypeScript compiles without errors

  **QA Scenarios**:
  ```
  Scenario: Verify namespace added
    Tool: Bash
    Steps:
      1. grep -q 'litellm' pulumi/kubernetes/namespaces.ts
    Expected Result: Exit code 0
    Evidence: .sisyphus/evidence/task-2-namespace.txt
  ```

  **Commit**: NO (groups with Wave 1)

---

- [ ] 3. Add images to image-versions-manifest.json

  **What to do**:
  - Add `litellm` image: `ghcr.io/berriai/litellm` tag `main-v1.81.12-stable.2`
  - Add `litellm-postgres` image: `postgres` tag `16`

  **Must NOT do**:
  - Do NOT use `:latest` tag

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: JSON addition
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: Task 6, 7
  - **Blocked By**: None

  **References**:
  - `pulumi/image-versions-manifest.json` - Existing image pattern

  **Acceptance Criteria**:
  - [ ] `litellm` entry exists with correct image and tag
  - [ ] `litellm-postgres` entry exists with correct image and tag
  - [ ] JSON is valid

  **QA Scenarios**:
  ```
  Scenario: Verify images added
    Tool: Bash
    Steps:
      1. jq -e '.litellm' pulumi/image-versions-manifest.json
      2. jq -e '.["litellm-postgres"]' pulumi/image-versions-manifest.json
    Expected Result: Both commands output valid JSON
    Evidence: .sisyphus/evidence/task-3-images.txt
  ```

  **Commit**: NO (groups with Wave 1)

---

- [ ] 4. Add secrets to sops.ts SecretsConfig

  **What to do**:
  - Add `litellm_master_key: string` to SecretsConfig interface
  - Add `litellm_salt_key: string` to SecretsConfig interface
  - Add `litellm_postgres_password: string` to SecretsConfig interface

  **Must NOT do**:
  - Do NOT hardcode values in TypeScript

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Interface property additions
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: Task 6, 7
  - **Blocked By**: None

  **References**:
  - `pulumi/lib/sops.ts:SecretsConfig` - Existing interface pattern

  **Acceptance Criteria**:
  - [ ] All three keys added to SecretsConfig interface
  - [ ] TypeScript compiles without errors

  **QA Scenarios**:
  ```
  Scenario: Verify SecretsConfig updated
    Tool: Bash
    Steps:
      1. grep -q 'litellm_master_key' pulumi/lib/sops.ts
      2. grep -q 'litellm_salt_key' pulumi/lib/sops.ts
      3. grep -q 'litellm_postgres_password' pulumi/lib/sops.ts
    Expected Result: All grep commands return exit code 0
    Evidence: .sisyphus/evidence/task-4-sops-interface.txt
  ```

  **Commit**: NO (groups with Wave 1)

---

- [ ] 5. Add secrets to secrets.yaml

  **What to do**:
  - Run `sops secrets/secrets.yaml`
  - Add `litellm_master_key: "sk-<random-32-chars>"` (generate secure random)
  - Add `litellm_salt_key: "sk-<random-32-chars>"` (generate secure random)
  - Add `litellm_postgres_password: "<random-32-chars>"` (no sk- prefix)

  **Must NOT do**:
  - Do NOT commit unencrypted secrets
  - Do NOT use weak passwords

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding YAML keys
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: Task 6, 7
  - **Blocked By**: None

  **References**:
  - `secrets/secrets.yaml` - Existing secrets pattern

  **Acceptance Criteria**:
  - [ ] All three keys added to secrets.yaml
  - [ ] File is encrypted (check with `sops -d`)

  **QA Scenarios**:
  ```
  Scenario: Verify secrets added and encrypted
    Tool: Bash
    Steps:
      1. sops -d secrets/secrets.yaml | grep -q 'litellm_master_key'
      2. sops -d secrets/secrets.yaml | grep -q 'litellm_salt_key'
      3. sops -d secrets/secrets.yaml | grep -q 'litellm_postgres_password'
    Expected Result: All commands succeed
    Evidence: .sisyphus/evidence/task-5-secrets.txt
  ```

  **Commit**: NO (groups with Wave 1)

---

- [ ] 6. Create litellm-postgres.ts factory

  **What to do**:
  - Create `pulumi/kubernetes/litellm-postgres.ts`
  - Implement `deployLiteLLMPostgres(config, provider)` factory function
  - Create K8s Secret for PostgreSQL credentials (from SOPS)
  - Create PVC (5Gi, Longhorn, ReadWriteOnce)
  - Create Deployment (postgres:16, 1 replica, env from secret)
  - Create **regular ClusterIP Service** (port 5432, NO static IP - internal only)

  **Deployment spec**:
  ```typescript
  {
    replicas: 1,
    image: "postgres:16",
    env: [
      { name: "POSTGRES_DB", value: "litellm" },
      { name: "POSTGRES_USER", value: "llmproxy" },
      { name: "POSTGRES_PASSWORD", valueFrom: { secretKeyRef: { name: "litellm-postgres-secrets", key: "password" } } }
    ],
    volumeMounts: [{ name: "data", mountPath: "/var/lib/postgresql/data" }],
    volumes: [{ name: "data", persistentVolumeClaim: { claimName: "litellm-postgres-pvc" } }],
    ports: [{ containerPort: 5432 }]
  }
  ```

  **Must NOT do**:
  - Do NOT hardcode passwords
  - Do NOT set replicas > 1

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: New factory with multiple K8s resources
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 7)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 1, 2, 3, 4, 5

  **References**:
  - `pulumi/kubernetes/syncthing.ts` - Pattern for PVC + Deployment + Service
  - `pulumi/kubernetes/networking.ts:getServiceIP()` - Static IP pattern
  - `pulumi/lib/sops.ts:loadSecrets()` - Secret loading pattern

  **Acceptance Criteria**:
  - [ ] File created at `pulumi/kubernetes/litellm-postgres.ts`
  - [ ] Factory function `deployLiteLLMPostgres` exported
  - [ ] TypeScript compiles without errors

  **QA Scenarios**:
  ```
  Scenario: Verify factory structure
    Tool: Bash
    Steps:
      1. grep -q 'export function deployLiteLLMPostgres' pulumi/kubernetes/litellm-postgres.ts
      2. grep -q 'PersistentVolumeClaim' pulumi/kubernetes/litellm-postgres.ts
      3. grep -q 'Deployment' pulumi/kubernetes/litellm-postgres.ts
      4. grep -q 'Service' pulumi/kubernetes/litellm-postgres.ts
    Expected Result: All grep commands return exit code 0
    Evidence: .sisyphus/evidence/task-6-postgres-factory.txt
  ```

  **Commit**: NO (groups with Wave 2)

---

- [ ] 7. Create litellm.ts factory

  **What to do**:
  - Create `pulumi/kubernetes/litellm.ts`
  - Implement `deployLiteLLM(config, provider)` factory function
  - Create K8s Secret for LiteLLM credentials (master key, salt key from SOPS)
  - Create Deployment (litellm image, 1 replica, env from secrets, depends on postgres)
  - Create ClusterIP Service (10.43.200.207:4000)
  - Create NodePort Service (30001:4000)

  **Deployment env vars**:
  ```typescript
  env: [
    { name: "DATABASE_URL", value: pulumi.interpolate`postgresql://llmproxy:${postgresPassword}@litellm-postgres:5432/litellm` },
    { name: "LITELLM_MASTER_KEY", valueFrom: { secretKeyRef: { name: "litellm-secrets", key: "master-key" } } },
    { name: "LITELLM_SALT_KEY", valueFrom: { secretKeyRef: { name: "litellm-secrets", key: "salt-key" } } },
    { name: "STORE_MODEL_IN_DB", value: "True" }
  ]
  // Where postgresPassword comes from secretKeyRef on postgres secret
  ```

  **Must NOT do**:
  - Do NOT hardcode secrets
  - Do NOT configure LLM models/providers
  - Do NOT create Cloudflare tunnel or Ingress

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex factory with multiple services and secret references
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 6)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 1, 2, 3, 4, 5, 6 (needs postgres service name)

  **References**:
  - `pulumi/kubernetes/syncthing.ts` - Pattern for dual services (ClusterIP + NodePort)
  - `pulumi/kubernetes/networking.ts:getServiceIP()` - Static IP pattern
  - `pulumi/lib/sops.ts:loadSecrets()` - Secret loading pattern

  **Acceptance Criteria**:
  - [ ] File created at `pulumi/kubernetes/litellm.ts`
  - [ ] Factory function `deployLiteLLM` exported
  - [ ] Two services created (ClusterIP + NodePort)
  - [ ] TypeScript compiles without errors

  **QA Scenarios**:
  ```
  Scenario: Verify factory structure
    Tool: Bash
    Steps:
      1. grep -q 'export function deployLiteLLM' pulumi/kubernetes/litellm.ts
      2. grep -q 'type: "NodePort"' pulumi/kubernetes/litellm.ts
      3. grep -q 'nodePort: 30001' pulumi/kubernetes/litellm.ts
      4. grep -q 'LITELLM_MASTER_KEY' pulumi/kubernetes/litellm.ts
    Expected Result: All grep commands return exit code 0
    Evidence: .sisyphus/evidence/task-7-litellm-factory.txt
  ```

  **Commit**: NO (groups with Wave 2)

---

- [ ] 8. Export from kubernetes/index.ts

  **What to do**:
  - Import `deployLiteLLMPostgres` from `./litellm-postgres`
  - Import `deployLiteLLM` from `./litellm`
  - Export both functions

  **Must NOT do**:
  - Do NOT modify other exports

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple import/export additions
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 9)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 6, 7

  **References**:
  - `pulumi/kubernetes/index.ts` - Existing export pattern

  **Acceptance Criteria**:
  - [ ] Both functions exported
  - [ ] TypeScript compiles without errors

  **QA Scenarios**:
  ```
  Scenario: Verify exports
    Tool: Bash
    Steps:
      1. grep -q 'deployLiteLLMPostgres' pulumi/kubernetes/index.ts
      2. grep -q 'deployLiteLLM' pulumi/kubernetes/index.ts
    Expected Result: Both grep commands return exit code 0
    Evidence: .sisyphus/evidence/task-8-exports.txt
  ```

  **Commit**: NO (groups with Wave 3)

---

- [ ] 9. Wire in pulumi/index.ts

  **What to do**:
  - Load secrets using `loadSecrets()`
  - Call `deployLiteLLMPostgres()` with namespace and provider
  - Call `deployLiteLLM()` with namespace, secrets, and provider

  **Wiring pattern**:
  ```typescript
  const secrets = loadSecrets();
  const { deployment: postgresDeployment, service: postgresService } = deployLiteLLMPostgres(
    { namespace: "litellm" },
    provider
  );
  const { deployment, service, externalService } = deployLiteLLM(
    { namespace: "litellm", secrets },
    provider
  );
  ```

  **Must NOT do**:
  - Do NOT call deployments before secrets are loaded

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding function calls to existing orchestration
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 8)
  - **Blocks**: Task 10
  - **Blocked By**: Tasks 6, 7, 8

  **References**:
  - `pulumi/index.ts` - Existing orchestration pattern
  - `pulumi/lib/sops.ts:loadSecrets()` - Secret loading

  **Acceptance Criteria**:
  - [ ] Both deploy functions called
  - [ ] Secrets loaded and passed
  - [ ] TypeScript compiles without errors

  **QA Scenarios**:
  ```
  Scenario: Verify wiring
    Tool: Bash
    Steps:
      1. grep -q 'deployLiteLLMPostgres' pulumi/index.ts
      2. grep -q 'deployLiteLLM' pulumi/index.ts
      3. grep -q 'loadSecrets' pulumi/index.ts
    Expected Result: All grep commands return exit code 0
    Evidence: .sisyphus/evidence/task-9-wiring.txt
  ```

  **Commit**: NO (groups with Wave 3)

---

- [ ] 10. Pulumi preview validation

  **What to do**:
  - Run `pulumi preview` to validate stack
  - Verify all resources are planned correctly
  - Check for any errors or warnings

  **Must NOT do**:
  - Do NOT run `pulumi up` yet

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single command validation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 11
  - **Blocked By**: Tasks 8, 9

  **References**:
  - N/A

  **Acceptance Criteria**:
  - [ ] `pulumi preview` succeeds with no errors
  - [ ] Preview shows expected resources (2 deployments, 2 PVCs, 2 secrets, 3 services)

  **QA Scenarios**:
  ```
  Scenario: Verify preview succeeds
    Tool: Bash
    Steps:
      1. cd pulumi && pulumi preview --expect-no-changes=false
    Expected Result: Command exits with code 0, shows planned resources
    Evidence: .sisyphus/evidence/task-10-preview.txt
  ```

  **Commit**: YES
  - Message: `feat(pulumi): add LiteLLM deployment with PostgreSQL`
  - Files: All modified/created files
  - Pre-commit: `pulumi preview` must pass

---

- [ ] 11. Deploy and verify

  **What to do**:
  - Run `pulumi up` to deploy
  - Wait for pods to reach Running state
  - Verify PostgreSQL connectivity
  - Verify LiteLLM UI accessible
  - Test master key authentication

  **Must NOT do**:
  - Do NOT skip verification steps

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Full deployment and multi-step verification
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: None
  - **Blocked By**: Task 10

  **References**:
  - N/A

  **Acceptance Criteria**:
  - [ ] `pulumi up` succeeds
  - [ ] PostgreSQL pod is Running
  - [ ] PostgreSQL PVC is Bound
  - [ ] LiteLLM pod is Running
  - [ ] ClusterIP accessible: `curl http://10.43.200.207:4000/health`
  - [ ] NodePort accessible: `curl http://<vps-ip>:30001/health`
  - [ ] Auth works: valid key returns 200, invalid returns 401

  **QA Scenarios**:
  ```
  Scenario: Verify deployment success
    Tool: Bash
    Steps:
      1. cd pulumi && pulumi up --yes
      2. kubectl wait --for=condition=ready pod -l app=litellm-postgres -n litellm --timeout=120s
      3. kubectl wait --for=condition=ready pod -l app=litellm -n litellm --timeout=120s
    Expected Result: All commands succeed, pods ready
    Evidence: .sisyphus/evidence/task-11-deploy.txt

  Scenario: Verify PostgreSQL PVC bound
    Tool: Bash
    Steps:
      1. kubectl get pvc litellm-postgres-pvc -n litellm -o jsonpath='{.status.phase}'
    Expected Result: Output is "Bound"
    Evidence: .sisyphus/evidence/task-11-pvc.txt

  Scenario: Verify LiteLLM health endpoint
    Tool: Bash
    Steps:
      1. kubectl exec -n litellm deploy/litellm -- curl -s http://localhost:4000/health
    Expected Result: Returns healthy status
    Evidence: .sisyphus/evidence/task-11-health.txt

  Scenario: Verify external NodePort access
    Tool: Bash
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" http://localhost:30001/health
    Expected Result: HTTP 200
    Evidence: .sisyphus/evidence/task-11-nodeport.txt

  Scenario: Verify master key auth
    Tool: Bash
    Steps:
      1. MASTER_KEY=$(sops -d secrets/secrets.yaml | yq -r '.litellm_master_key')
      2. curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $MASTER_KEY" http://localhost:30001/v1/models
      3. curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer invalid" http://localhost:30001/v1/models
    Expected Result: First returns 200, second returns 401
    Evidence: .sisyphus/evidence/task-11-auth.txt
  ```

  **Commit**: NO (deployment is runtime, not code change)

---

## Final Verification Wave (MANDATORY)

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Verify all "Must Have": networking.ts has litellm IP (NOT litellm-postgres), namespaces.ts has namespace, litellm.ts exists, litellm-postgres.ts exists, both factories exported, PVCs defined, Secrets defined, services defined (ClusterIP + NodePort for LiteLLM, regular ClusterIP for PostgreSQL). Verify "Must NOT Have": no Cloudflare tunnel, no Ingress, no hardcoded secrets, no SQLite, no model config, no static IP for PostgreSQL.
  Output: `Must Have [10/10] | Must NOT Have [6/6] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Pulumi State Verification** — `unspecified-high`
  Run `pulumi stack output`. Check `kubectl get all,pvc,secret -n litellm`. Verify: LiteLLM ClusterIP = 10.43.200.207 (static), PostgreSQL has regular ClusterIP (dynamic), NodePort = 30001, both PVCs Bound.
  Output: `Resources [N created] | PVCs [2/2 Bound] | Services [3/3] | Secrets [2/2] | VERDICT`

- [ ] F3. **Runtime Verification** — `unspecified-high`
  - PostgreSQL: `kubectl exec -n litellm deploy/litellm-postgres -- pg_isready` returns OK
  - LiteLLM health: `curl http://10.43.200.207:4000/health` returns 200
  - NodePort: `curl http://<vps-ip>:30001/health` returns 200
  - Auth: valid master key returns 200 on /v1/models, invalid returns 401
  - UI: `curl http://<vps-ip>:30001/ui` returns HTML
  Output: `PostgreSQL [PASS] | ClusterIP [PASS] | NodePort [PASS] | Auth [PASS] | UI [PASS] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  Verify no model/provider config in Pulumi code. Verify no Cloudflare tunnel. Verify no Ingress. Verify using PostgreSQL not SQLite. Verify PostgreSQL uses regular ClusterIP (no static). Check PVC sizes (5Gi). Check resources (100m/256Mi for both).
  Output: `Scope [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **Single commit** after all tasks: `feat(pulumi): add LiteLLM deployment`
- Files: All modified/created files in single atomic commit
- Pre-commit: `pulumi preview` must pass

---

## Success Criteria

### Verification Commands
```bash
# Verify Pulumi stack
cd pulumi && pulumi stack output

# Verify K8s resources
kubectl get all,pvc,secret -n litellm

# Verify PostgreSQL PVC is bound
kubectl get pvc litellm-postgres-pvc -n litellm -o jsonpath='{.status.phase}'
# Expected: Bound

# Verify PostgreSQL is ready
kubectl exec -n litellm deploy/litellm-postgres -- pg_isready -U llmproxy -d litellm
# Expected: "accepting connections"

# Verify pods are running
kubectl get pods -n litellm
# Expected: Both pods Running

# Verify ClusterIP (from within cluster)
kubectl run curl-test --rm -it --image=curlimages/curl -- curl -s http://10.43.200.207:4000/health
# Expected: {"status": "healthy"} or similar

# Verify NodePort (from VPS)
curl -s -o /dev/null -w "%{http_code}" http://localhost:30001/health
# Expected: 200

# Verify UI accessible
curl -s http://localhost:30001/ui | head -20
# Expected: HTML content

# Verify auth (with master key)
MASTER_KEY=$(sops -d secrets/secrets.yaml | yq -r '.litellm_master_key')
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $MASTER_KEY" http://localhost:30001/v1/models
# Expected: 200

# Verify auth fails with invalid key
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer invalid-key" http://localhost:30001/v1/models
# Expected: 401
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Pulumi preview passes
- [ ] Deployment successful
- [ ] PostgreSQL running and accepting connections
- [ ] LiteLLM connected to PostgreSQL
- [ ] LiteLLM UI accessible at NodePort 30001
- [ ] Master key auth works
- [ ] Can access /ui endpoint
