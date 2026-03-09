# OpenClaw Operator — Pulumi Infrastructure

## TL;DR

> **Quick Summary**: Deploy `openclaw-rocks/k8s-operator` to the K3s cluster via Helm, create an `OpenClawInstance` CR with file-based (merge-mode) self-configuration, and expose the dashboard via Cloudflare Zero Trust Tunnel.
>
> **Deliverables**:
> - `pulumi/kubernetes/openclaw.ts` — Helm Release + `OpenClawInstance` CR + cloudflared Deployment
> - `pulumi/cloudflare/zero-trust-openclaw.ts` — Zero Trust Application + Access Policy
> - Updates to `namespaces.ts`, `networking.ts`, `lib/sops.ts`, `cloudflare/index.ts`, `kubernetes/index.ts`, `index.ts`
>
> **Estimated Effort**: Short
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 → Task 3 → Task 4

---

## Context

### Original Request
Deploy `openclaw-rocks/k8s-operator` w Pulumi. Dashboard za Cloudflare Zero Trust + Tunel. OpenClaw ma się sam konfigurować przez pliki na PVC — NIE przez Kubernetes API (żeby uniknąć konfliktu z Pulumi).

### Interview Summary
**Key Discussions**:
- Self-configure via K8s API (`selfConfigure.enabled`) — **DISABLED** — konflikt z Pulumi-zarządzanymi zasobami
- `spec.config.mergeMode: merge` — operator głęboko łączy konfigurację operatora z istniejącą konfiguracją na PVC, zachowując zmiany runtime
- Port 18789 (gateway / Control UI) jako target dla Cloudflare tunnel
- `gateway.allowedOrigins: ["*"]` wymagane w `config.raw` dla hostname Cloudflare tunnel
- Wzorzec projektu: osobny `cloudflared` Deployment (nie sidecar), factory `deployX()`, stały ClusterIP w `networking.ts`

**Research Findings**:
- `OpenClawInstance` CRD v1alpha1 — operator musi być wdrożony (Helm) zanim CR zostanie stworzony
- Helm chart: `oci://ghcr.io/openclaw-rocks/charts/openclaw-operator`
- `dependsOn: [operatorRelease]` krytyczne dla uniknięcia race condition na CRD

### Metis Review
**Identified Gaps** (addressed):
- CRD race condition → `dependsOn: [operatorRelease]` na CR
- NetworkPolicy blokująca cloudflared → jawna reguła allow ingress z namespace cloudflared
- OCI Helm chart syntax → użyć `chart: "openclaw-operator"` + `fetchOpts.repo: "oci://ghcr.io/openclaw-rocks/charts"`

---

## Work Objectives

### Core Objective
Zintegrować operator OpenClaw z istniejącą infrastrukturą Pulumi, umożliwiając agentowi AI samodzielną konfigurację przez pliki na PVC, bez dostępu do Kubernetes API.

### Concrete Deliverables
- `pulumi/kubernetes/openclaw.ts` z funkcją `deployOpenclaw()`
- `pulumi/cloudflare/zero-trust-openclaw.ts` z funkcją `createOpenclawZeroTrust()`
- Aktualizacje 5 istniejących plików (namespaces, networking, sops, indeksy, index.ts)

### Definition of Done
- [ ] `cd pulumi && bun run tsc --noEmit` przechodzi bez błędów
- [ ] `cd pulumi && pulumi preview` planuje zasoby bez błędów kompilacji
- [ ] Zasoby logiczne: namespace `openclaw`, Helm Release operatora, CR `OpenClawInstance`, Secret z tokenem tunelu, cloudflared Deployment, Zero Trust Application + Policy

### Must Have
- Operator wdrożony przez Helm (`k8s.helm.v3.Release`)
- `OpenClawInstance` CR z `dependsOn` na Helm Release (unikanie race condition CRD)
- `spec.config.mergeMode: "merge"` w CR
- `spec.selfConfigure` nieobecne lub `enabled: false` w CR
- `gateway.allowedOrigins: ["*"]` w `spec.config.raw`
- Cloudflare Zero Trust Application + Access Policy dla domeny OpenClaw
- cloudflared Deployment w namespace `openclaw` z tokenem z `createTunnel()`
- Stały ClusterIP zarejestrowany w `kubernetes/networking.ts`

### Must NOT Have (Guardrails)
- **NO `selfConfigure.enabled: true`** — grantuje RBAC + otwiera egress K8s API, konflikt z Pulumi
- **NO hardcoded domains/emails/secrets** — wszystko przez `SecretsConfig` z SOPS
- **NO modyfikacja `hardware-configuration.nix`** (poza zakresem, ale przypomnienie)
- **NO dodawanie konfiguracji OpenClaw poza bazowymi wymogami CR** — respekt dla file-based self-config agenta
- **NO `determinate.url` z `nixpkgs.follows`** (poza zakresem)
- **NO nowe pola SOPS bez ich dodania do `SecretsConfig` w `lib/sops.ts`**

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (bun + TypeScript)
- **Automated tests**: Tests-after (TypeScript type-check `tsc --noEmit` per task)
- **Framework**: bun (type-checking), `pulumi preview` jako integracyjny check
- **No unit tests** (Pulumi infrastructure — standard w tym projekcie)

### QA Policy
Każdy task kończy `tsc --noEmit`. Task 4 kończy `pulumi preview`.
Evidence: output z Bash tool.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundational config):
└── Task 1: Aktualizacja core configs (namespaces, networking, sops) [quick]

Wave 2 (After Wave 1 — równoległe moduły):
├── Task 2: Zero Trust Policy dla OpenClaw [unspecified-low]
└── Task 3: K8s Deployment module (Helm + CR + cloudflared) [unspecified-high]

Wave 3 (After Wave 2 — wiring):
└── Task 4: Wiring w index.ts + pulumi preview [quick]

Wave FINAL (After Task 4 — niezależny review):
└── Task F1: Type check + plan compliance audit [unspecified-high]

Critical Path: Task 1 → Task 3 → Task 4 → F1
Parallel Speedup: ~30% szybciej niż sekwencyjnie
Max Concurrent: 2 (Wave 2)
```

### Dependency Matrix

| Task | Zależy od | Blokuje |
|------|-----------|---------|
| 1 | — | 2, 3 |
| 2 | 1 | 4 |
| 3 | 1 | 4 |
| 4 | 2, 3 | F1 |
| F1 | 4 | — |

### Agent Dispatch Summary

- **Wave 1**: T1 → `quick`
- **Wave 2**: T2 → `unspecified-low`, T3 → `unspecified-high` (równolegle)
- **Wave 3**: T4 → `quick`
- **Final**: F1 → `unspecified-high`

---

## TODOs

- [ ] 1. Aktualizacja core configs (namespaces, networking, sops)

  **What to do**:
  - Dodaj `"openclaw"` do listy namespaców w `pulumi/kubernetes/namespaces.ts` — śledź istniejący wzorzec (`k8s.core.v1.Namespace`)
  - Dodaj statyczny ClusterIP `openclaw` w `pulumi/kubernetes/networking.ts` w mapie `serviceIPs` — użyj kolejnego wolnego IP z puli `10.43.200.x` (sprawdź zajęte IPs w pliku)
  - Dodaj pola `openclaw_domain: string` i `openclaw_cf_access_policy_email?: string` do interfejsu `SecretsConfig` w `pulumi/lib/sops.ts`
  - Dodaj te same pola w wywołaniu `decryptSopsFile<SecretsConfig>()` / w `loadSecrets()` jeśli potrzebna deserializacja ręczna (śledź wzorzec istniejących pól)

  **Must NOT do**:
  - NIE hardcode-uj żadnych wartości — tylko typy w `SecretsConfig`
  - NIE modyfikuj `hardware-configuration.nix`
  - NIE zmieniaj logiki `loadSecrets()`, tylko rozszerz interfejs

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Proste rozszerzenia istniejących plików, wzorce oczywiste
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-master`: nie potrzebny do prostych edycji pliku

  **Parallelization**:
  - **Can Run In Parallel**: NO (Wave 1, solo start)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 2, 3
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `pulumi/kubernetes/namespaces.ts` — wzorzec dodawania namespace, jak inne serwisy (np. `perplexica`, `litellm`)
  - `pulumi/kubernetes/networking.ts` — mapa `serviceIPs`, dodaj klucz `openclaw` z kolejnym IP
  - `pulumi/lib/sops.ts` — interfejs `SecretsConfig` i `loadSecrets()` — dodaj nowe pola stringowe

  **Acceptance Criteria**:
  - [ ] `cd pulumi && bun run tsc --noEmit` przechodzi bez błędów po zmianach
  - [ ] `namespaces.ts` zawiera `openclaw`
  - [ ] `networking.ts` zawiera `openclaw` w `serviceIPs`
  - [ ] `sops.ts:SecretsConfig` zawiera `openclaw_domain` i `openclaw_cf_access_policy_email`

  **QA Scenarios**:

  ```
  Scenario: TypeScript kompiluje się po zmianach
    Tool: Bash
    Preconditions: Zmiany w namespaces.ts, networking.ts, sops.ts
    Steps:
      1. Uruchom: cd pulumi && bun run tsc --noEmit
      2. Sprawdź exit code (0 = sukces)
    Expected Result: Brak output (żadnych błędów TypeScript)
    Failure Indicators: Jakikolwiek output z błędem TS
    Evidence: terminal output (exit code 0)
  ```

  **Commit**: YES
  - Message: `feat(pulumi): add openclaw namespace, ip and secret types`
  - Files: `pulumi/kubernetes/namespaces.ts`, `pulumi/kubernetes/networking.ts`, `pulumi/lib/sops.ts`
  - Pre-commit: `cd pulumi && bun run tsc --noEmit`

---

- [ ] 2. Cloudflare Zero Trust Policy dla OpenClaw

  **What to do**:
  - Stwórz `pulumi/cloudflare/zero-trust-openclaw.ts`
  - Wzoruj się **dokładnie** na istniejącym pliku np. `pulumi/cloudflare/zero-trust-perplexica.ts` lub `zero-trust-litellm.ts`
  - Eksportuj funkcję `createOpenclawZeroTrust(config, provider)` tworzącą:
    - `cloudflare.ZeroTrustAccessApplication` z domeną z `secrets.openclaw_domain`
    - `cloudflare.ZeroTrustAccessPolicy` z typem `email` (jeśli `openclaw_cf_access_policy_email` podany) lub `everyone` (jeśli brak)
  - Dodaj re-export do `pulumi/cloudflare/index.ts`

  **Must NOT do**:
  - NIE hardcode-uj domeny ani emaili — use `secrets.openclaw_domain`
  - NIE zmieniaj innych zero-trust plików

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Kopiowanie istniejącego wzorca z minimalną adaptacją
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (razem z Task 3 w Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 4
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `pulumi/cloudflare/zero-trust-perplexica.ts` — wzorzec Zero Trust Application + Policy (kopiuj strukturę 1:1)
  - `pulumi/cloudflare/zero-trust-litellm.ts` — alternatywny przykład jeśli perplexica niedostępna
  - `pulumi/cloudflare/index.ts` — jak dodać re-export nowej funkcji

  **Acceptance Criteria**:
  - [ ] Plik `pulumi/cloudflare/zero-trust-openclaw.ts` istnieje
  - [ ] Eksportuje `createOpenclawZeroTrust`
  - [ ] `cloudflare/index.ts` re-eksportuje `createOpenclawZeroTrust`
  - [ ] `cd pulumi && bun run tsc --noEmit` przechodzi

  **QA Scenarios**:

  ```
  Scenario: TypeScript kompiluje się z nowym plikiem
    Tool: Bash
    Preconditions: Plik zero-trust-openclaw.ts stworzony, dodany do index.ts
    Steps:
      1. Uruchom: cd pulumi && bun run tsc --noEmit
      2. Sprawdź exit code (0 = sukces)
    Expected Result: Brak błędów TypeScript
    Failure Indicators: Jakikolwiek output z błędem TS
    Evidence: terminal output

  Scenario: Eksport dostępny z cloudflare/index.ts
    Tool: Bash
    Preconditions: Zmiany gotowe
    Steps:
      1. Uruchom: grep -r "createOpenclawZeroTrust" pulumi/cloudflare/index.ts
    Expected Result: Linia z eksportem widoczna
    Failure Indicators: Brak output (eksport brakuje)
    Evidence: grep output
  ```

  **Commit**: YES
  - Message: `feat(pulumi/cloudflare): add openclaw zero trust application and policy`
  - Files: `pulumi/cloudflare/zero-trust-openclaw.ts`, `pulumi/cloudflare/index.ts`
  - Pre-commit: `cd pulumi && bun run tsc --noEmit`

---

- [ ] 3. K8s Deployment module — Helm + CR + cloudflared

  **What to do**:
  - Stwórz `pulumi/kubernetes/openclaw.ts` eksportujący `deployOpenclaw(config: OpenClawConfig, provider: k8s.Provider): OpenClawOutputs`
  - **Wersja chartu jako stała na górze pliku** (wzorzec: `longhorn.ts:11`, `monitoring.ts:28`):
    ```typescript
    const OPENCLAW_OPERATOR_VERSION = "0.10.25";
    ```
  - **Helm Release operatora**:
    ```typescript
    new k8s.helm.v3.Release("openclaw-operator", {
      chart: "openclaw-operator",
      version: OPENCLAW_OPERATOR_VERSION,
      namespace: config.namespace.metadata.name,
      fetchOpts: { repo: "oci://ghcr.io/openclaw-rocks/charts" },
    }, { provider, dependsOn: [config.namespace] })
    ```
  - **`OpenClawInstance` CR** (MUSI `dependsOn: [operatorRelease]` bo CRD race condition):
    ```typescript
    new k8s.apiextensions.CustomResource("openclaw-instance", {
      apiVersion: "openclaw.rocks/v1alpha1",
      kind: "OpenClawInstance",
      metadata: { name: "openclaw", namespace: config.namespace.metadata.name },
      spec: {
        config: {
          mergeMode: "merge",
          raw: JSON.stringify({ gateway: { allowedOrigins: ["*"] } })
        },
        // selfConfigure: ABSENT (nie dodawaj)
      }
    }, { provider, dependsOn: [operatorRelease] })
    ```
  - **K8s Secret z tunnel tokenem**:
    ```typescript
    new k8s.core.v1.Secret("openclaw-tunnel-secret", {
      metadata: { name: "openclaw-tunnel-secret", namespace: ... },
      stringData: { TUNNEL_TOKEN: config.tunnelToken }
    }, { provider })
    ```
  - **cloudflared Deployment** (wzoruj się na `kubernetes/monitoring.ts` lub innym serwisie z oddzielnym cloudflared):
    - image: `cloudflare/cloudflared:latest`
    - args: `["tunnel", "--no-autoupdate", "run"]`
    - env: `TUNNEL_TOKEN` z secretKeyRef `openclaw-tunnel-secret`
  - Dodaj re-export do `pulumi/kubernetes/index.ts`

  **Must NOT do**:
  - NIE pomijaj `dependsOn: [operatorRelease]` na CR — to krytyczne dla uniknięcia race condition
  - NIE dodawaj `selfConfigure` do specyfikacji CR
  - NIE hardcode-uj namespace stringiem — używaj `config.namespace.metadata.name`
  - NIE dodawaj cloudflared jako sidecar — osobny Deployment

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Wymaga koordynacji Helm + CRD (race condition) + cloudflared + wzorzec OCI chart
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (razem z Task 2 w Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 4
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `pulumi/kubernetes/monitoring.ts` — wzorzec Helm Release + osobny cloudflared Deployment
  - `pulumi/kubernetes/litellm/proxy.ts` — wzorzec Secret + Deployment z env z secretKeyRef
  - `pulumi/kubernetes/namespaces.ts` — jak referencjonować namespace object
  - `pulumi/kubernetes/networking.ts` — `serviceIPs.openclaw` dla ClusterIP

  **API/Type References**:
  - `OpenClawInstance` spec: `config.mergeMode`, `config.raw`, bez `selfConfigure`
  - OCI Helm: `chart: "openclaw-operator"`, `fetchOpts: { repo: "oci://ghcr.io/openclaw-rocks/charts" }`

  **External References**:
  - https://github.com/openclaw-rocks/k8s-operator — README + API reference dla pól CR spec

  **Acceptance Criteria**:
  - [ ] Plik `pulumi/kubernetes/openclaw.ts` istnieje
  - [ ] `kubernetes/index.ts` re-eksportuje `deployOpenclaw`
  - [ ] CR zawiera `spec.config.mergeMode: "merge"`
  - [ ] CR zawiera `spec.config.raw` z `gateway.allowedOrigins: ["*"]`
  - [ ] CR NIE zawiera `spec.selfConfigure.enabled: true`
  - [ ] CR ma jawne `dependsOn: [operatorRelease]`
  - [ ] cloudflared Deployment istnieje jako osobny zasób (nie sidecar)
  - [ ] `cd pulumi && bun run tsc --noEmit` przechodzi

  **QA Scenarios**:

  ```
  Scenario: TypeScript kompiluje się z nowym modułem
    Tool: Bash
    Preconditions: openclaw.ts stworzony, index.ts zaktualizowany
    Steps:
      1. Uruchom: cd pulumi && bun run tsc --noEmit
      2. Sprawdź exit code 0
    Expected Result: Brak błędów TypeScript
    Failure Indicators: Jakikolwiek output z błędem TS
    Evidence: terminal output

  Scenario: selfConfigure nieobecne w CR spec
    Tool: Bash
    Preconditions: Plik openclaw.ts stworzony
    Steps:
      1. Uruchom: grep -n "selfConfigure" pulumi/kubernetes/openclaw.ts
    Expected Result: Brak output (selfConfigure nieobecne)
    Failure Indicators: Jakakolwiek linia z "selfConfigure"
    Evidence: grep output (pusty = sukces)

  Scenario: dependsOn obecne na CR
    Tool: Bash
    Preconditions: Plik openclaw.ts stworzony
    Steps:
      1. Uruchom: grep -n "dependsOn" pulumi/kubernetes/openclaw.ts
    Expected Result: Linia z dependsOn widoczna przy CR
    Failure Indicators: Brak output
    Evidence: grep output
  ```

  **Commit**: YES
  - Message: `feat(pulumi/k8s): add openclaw operator helm + instance cr + cloudflared`
  - Files: `pulumi/kubernetes/openclaw.ts`, `pulumi/kubernetes/index.ts`
  - Pre-commit: `cd pulumi && bun run tsc --noEmit`

---

- [ ] 4. Wiring w pulumi/index.ts

  **What to do**:
  - W `pulumi/index.ts` dodaj sekwencję (wzoruj się na innym serwisie np. litellm lub perplexica):
    1. `const openclawTunnel = createTunnel({ tunnelName: "openclaw", domainName: secrets.openclaw_domain, serviceUrl: "http://openclaw-gateway:18789", ... })`
    2. `createOpenclawZeroTrust({ domain: secrets.openclaw_domain, ... }, cfProvider)`
    3. `deployOpenclaw({ namespace: namespaces.openclaw, tunnelToken: openclawTunnel.tunnelToken, ... }, k8sProvider)`
    4. Dodaj export: `export const openclawUrl = pulumi.interpolate\`https://${secrets.openclaw_domain}\``
  - Upewnij się że namespace `openclaw` jest tworzony w `createNamespaces()` call — jeśli namespaces.ts eksportuje obiekty, sprawdź że openclaw tam jest

  **Must NOT do**:
  - NIE zmieniaj kolejności istniejących wywołań — dodaj na końcu sekcji deployments
  - NIE hardcode-uj żadnych wartości

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Proste wiring — doklejenie 3-4 wywołań funkcji wg istniejącego wzorca
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (czeka na Tasks 2 i 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: F1
  - **Blocked By**: Tasks 2, 3

  **References**:

  **Pattern References**:
  - `pulumi/index.ts` — sekcja gdzie są wywoływane inne serwisy (litellm, perplexica) — kopiuj wzorzec 1:1
  - `pulumi/cloudflare/tunnel.ts:createTunnel` — sygnatura i wymagane pola konfiguracji
  - `pulumi/cloudflare/index.ts` — import `createOpenclawZeroTrust`
  - `pulumi/kubernetes/index.ts` — import `deployOpenclaw`

  **Acceptance Criteria**:
  - [ ] `pulumi/index.ts` zawiera wywołanie `createTunnel` dla openclaw
  - [ ] `pulumi/index.ts` zawiera wywołanie `createOpenclawZeroTrust`
  - [ ] `pulumi/index.ts` zawiera wywołanie `deployOpenclaw`
  - [ ] `cd pulumi && bun run tsc --noEmit` przechodzi
  - [ ] `cd pulumi && pulumi preview` planuje ~15-20 nowych zasobów bez błędów

  **QA Scenarios**:

  ```
  Scenario: pulumi preview planuje zasoby openclaw bez błędów
    Tool: Bash
    Preconditions: Wszystkie 4 taski ukończone, pulumi skonfigurowany
    Steps:
      1. Uruchom: cd pulumi && pulumi preview 2>&1 | tail -20
      2. Sprawdź exit code (0 = sukces)
      3. Sprawdź obecność zasobów openclaw w output
    Expected Result: Exit code 0, widoczne zasoby "openclaw" w planie, "0 errors"
    Failure Indicators: Exit code != 0, "error" w output, brak zasobów openclaw
    Evidence: terminal output ostatnie 20 linii

  Scenario: TypeScript kompiluje się z pełnym wiringiem
    Tool: Bash
    Preconditions: index.ts zaktualizowany
    Steps:
      1. Uruchom: cd pulumi && bun run tsc --noEmit
    Expected Result: Brak błędów
    Failure Indicators: Jakikolwiek błąd TS
    Evidence: terminal output (pusty = sukces)
  ```

  **Commit**: YES
  - Message: `feat(pulumi): wire openclaw infrastructure in index.ts`
  - Files: `pulumi/index.ts`
  - Pre-commit: `cd pulumi && bun run tsc --noEmit`

---

## Final Verification Wave

- [ ] F1. **Type Check + Plan Compliance Audit** — `unspecified-high`

  Uruchom `cd pulumi && bun run tsc --noEmit` — musi przejść bez błędów.
  Sprawdź czy w wygenerowanym kodzie nie ma: `selfConfigure.enabled: true`, hardcoded domeny/emaile/sekrety, brakującego `dependsOn` na Helm Release dla CR.
  Sprawdź `kubectl get openclawinstance -n openclaw` jeśli klaster dostępny.
  Output: `TypeScript [PASS/FAIL] | selfConfigure [ABSENT/PRESENT] | dependsOn [PRESENT/ABSENT] | VERDICT`

---

## Commit Strategy

1. `feat(pulumi): add openclaw namespace, ip and secret types`
2. `feat(pulumi/cloudflare): add openclaw zero trust application and policy`
3. `feat(pulumi/k8s): add openclaw operator helm + instance cr + cloudflared`
4. `feat(pulumi): wire openclaw infrastructure in index.ts`

## Success Criteria

### Verification Commands
```bash
cd pulumi && bun run tsc --noEmit  # Expected: no output (no errors)
cd pulumi && pulumi preview         # Expected: ~15-20 resources planned, 0 errors
kubectl get namespace openclaw      # Expected: Active
kubectl get openclawinstance -n openclaw  # Expected: resource exists
kubectl get pods -n openclaw        # Expected: operator + instance + cloudflared pods
```

### Final Checklist
- [ ] `tsc --noEmit` — czyste
- [ ] `pulumi preview` — ~15-20 zasobów, 0 błędów
- [ ] `selfConfigure` nieobecne lub disabled w CR
- [ ] `mergeMode: merge` obecne w CR
- [ ] `gateway.allowedOrigins: ["*"]` w config.raw
- [ ] `dependsOn: [operatorRelease]` na CR
- [ ] cloudflared Deployment w namespace openclaw
- [ ] Zero Trust Application + Policy dla domeny openclaw
