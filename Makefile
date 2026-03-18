.PHONY: deploy update kubeconfig pulumi secrets nix-shell help

# Machine target (default: ratmachine)
MACHINE ?= ratmachine
# Direct target address (optional, bypasses secrets lookup)
TARGET ?=

# Default target
help:
	@echo "Available targets:"
	@echo "  deploy [MACHINE=xxx] [TARGET=user@host]   - Initial NixOS deployment"
	@echo "  update [MACHINE=xxx] [TARGET=user@host]   - Update NixOS config"
	@echo "  kubeconfig [MACHINE=xxx] [TARGET=user@host] - Fetch kubeconfig"
	@echo "  pulumi                    - Deploy Kubernetes infrastructure via Pulumi"
	@echo "  secrets                   - Edit encrypted secrets"
	@echo "  nix-shell                 - Enter development shell"
	@echo ""
	@echo "Examples:"
	@echo "  make update                                - ratmachine from secrets"
	@echo "  make update MACHINE=konrad-think           - konrad-think from secrets"
	@echo "  make update MACHINE=konrad-think TARGET=root@192.168.1.100"
	@echo "  make deploy MACHINE=konrad-think TARGET=ubuntu@192.168.1.100"

# NixOS deployment (initial)
deploy:
	@./scripts/deploy.sh $(MACHINE) $(TARGET)

# NixOS update
update:
	@./scripts/update.sh $(MACHINE) $(TARGET)

# Fetch kubeconfig
kubeconfig:
	@./scripts/fetch-kubeconfig.sh $(MACHINE) $(TARGET)

# Pulumi deployment
pulumi:
	@./scripts/deploy-pulumi.sh

# Edit secrets
secrets:
	@sops secrets/secrets.yaml

# Development shell
nix-shell:
	@nix develop
