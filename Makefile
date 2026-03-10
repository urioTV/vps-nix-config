.PHONY: deploy update kubeconfig pulumi secrets nix-shell help

# Default target
help:
	@echo "Available targets:"
	@echo "  deploy      - Initial NixOS deployment (nixos-anywhere)"
	@echo "  update      - Update NixOS config (deploy-rs)"
	@echo "  kubeconfig  - Fetch kubeconfig from VPS"
	@echo "  pulumi      - Deploy Kubernetes infrastructure via Pulumi"
	@echo "  secrets     - Edit encrypted secrets"
	@echo "  nix-shell   - Enter development shell"

# NixOS deployment (initial)
deploy:
	@./scripts/deploy.sh

# NixOS update
update:
	@./scripts/update.sh

# Fetch kubeconfig
kubeconfig:
	@./scripts/fetch-kubeconfig.sh

# Pulumi deployment
pulumi:
	@./scripts/deploy-pulumi.sh

# Edit secrets
secrets:
	@sops secrets/secrets.yaml

# Development shell
nix-shell:
	@nix develop
