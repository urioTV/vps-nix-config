#!/bin/bash

set -e

NAMESPACE="cli-proxy-api"
POD_NAME=""
BINARY="/CLIProxyAPI/CLIProxyAPIPlus"
OAUTH_PORT=8085
PORT_FORWARD_PID=""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

cleanup() {
    if [ -n "$PORT_FORWARD_PID" ] && kill -0 "$PORT_FORWARD_PID" 2>/dev/null; then
        kill "$PORT_FORWARD_PID" 2>/dev/null || true
        echo -e "\n${YELLOW}Port-forward stopped${NC}"
    fi
}

trap cleanup EXIT INT TERM

print_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║              CLIProxyAPI Plus - Provider Login                ║"
    echo "║              All AI Providers in One Place                    ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

get_pod_name() {
    POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app=cli-proxy-api -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [ -z "$POD_NAME" ]; then
        echo -e "${RED}Error: No running pod found in namespace '$NAMESPACE'${NC}"
        echo "  kubectl get pods -n $NAMESPACE"
        exit 1
    fi
    
    echo -e "${GREEN}Pod: $POD_NAME${NC}"
}

start_port_forward() {
    if [ -n "$PORT_FORWARD_PID" ] && kill -0 "$PORT_FORWARD_PID" 2>/dev/null; then
        return
    fi
    
    echo -e "${CYAN}Starting port-forward localhost:${OAUTH_PORT} -> pod:${OAUTH_PORT}...${NC}"
    kubectl port-forward -n "$NAMESPACE" "pods/${POD_NAME}" ${OAUTH_PORT}:${OAUTH_PORT} >/dev/null 2>&1 &
    PORT_FORWARD_PID=$!
    sleep 2
    
    if kill -0 "$PORT_FORWARD_PID" 2>/dev/null; then
        echo -e "${GREEN}Port-forward active${NC}"
    else
        echo -e "${RED}Failed to start port-forward${NC}"
        exit 1
    fi
}

login_oauth() {
    local flag="$1"
    local name="$2"
    echo -e "\n${YELLOW}=== ${name} ===${NC}"
    start_port_forward
    kubectl exec -n "$NAMESPACE" -it "$POD_NAME" -- "$BINARY" $flag -oauth-callback-port ${OAUTH_PORT}
}

login_device() {
    local flag="$1"
    local name="$2"
    echo -e "\n${YELLOW}=== ${name} (device code) ===${NC}"
    kubectl exec -n "$NAMESPACE" -it "$POD_NAME" -- "$BINARY" $flag
}

login_gemini() { login_oauth "-login" "Gemini CLI"; }
login_gemini_incognito() { 
    echo -e "\n${YELLOW}=== Gemini CLI (Incognito) ===${NC}"
    start_port_forward
    kubectl exec -n "$NAMESPACE" -it "$POD_NAME" -- "$BINARY" -login -incognito -oauth-callback-port ${OAUTH_PORT}
}
login_claude() { login_oauth "-claude-login" "Claude Code"; }
login_codex() { login_oauth "-codex-login" "OpenAI Codex"; }
login_codex_device() { login_device "-codex-device-login" "OpenAI Codex"; }
login_qwen() { login_oauth "-qwen-login" "Qwen Code"; }
login_iflow() { login_oauth "-iflow-login" "iFlow"; }
login_iflow_cookie() { login_device "-iflow-cookie" "iFlow Cookie"; }
login_antigravity() { login_oauth "-antigravity-login" "Antigravity"; }
login_github_copilot() { login_device "-github-copilot-login" "GitHub Copilot"; }
login_gitlab() { login_oauth "-gitlab-login" "GitLab Duo"; }
login_gitlab_token() { login_device "-gitlab-token-login" "GitLab Duo Token"; }
login_kilo() { login_device "-kilo-login" "Kilo AI"; }
login_kimi() { login_oauth "-kimi-login" "Kimi"; }
login_kiro_google() { login_oauth "-kiro-login" "Kiro (Google)"; }
login_kiro_aws() { 
    echo -e "\n${YELLOW}=== Kiro (AWS Builder ID) ===${NC}"
    start_port_forward
    kubectl exec -n "$NAMESPACE" -it "$POD_NAME" -- "$BINARY" -kiro-aws-login -oauth-callback-port ${OAUTH_PORT}
}
login_kiro_aws_authcode() { 
    echo -e "\n${YELLOW}=== Kiro (AWS Auth Code) ===${NC}"
    start_port_forward
    kubectl exec -n "$NAMESPACE" -it "$POD_NAME" -- "$BINARY" -kiro-aws-authcode -oauth-callback-port ${OAUTH_PORT}
}
login_kiro_import() { login_device "-kiro-import" "Kiro Import"; }

show_status() {
    echo -e "\n${BLUE}=== Auth Files ===${NC}"
    kubectl exec -n "$NAMESPACE" "$POD_NAME" -- sh -c "ls -la /root/.cli-proxy-api/*.json 2>/dev/null || echo 'No auth files'"
    echo -e "\n${BLUE}=== Models ===${NC}"
    kubectl exec -n "$NAMESPACE" "$POD_NAME" -- wget -qO- http://localhost:8317/v1/models 2>/dev/null | head -c 1000 || echo "API error"
}

show_help() {
    echo -e "\n${BLUE}=== Providers ===${NC}"
    echo "Gemini: Free Gemini 2.5 Pro/Flash"
    echo "Claude: Claude Opus 4, Sonnet 4, Haiku"
    echo "Codex: GPT-5, Codex models"
    echo "Qwen: Qwen3 Coder Plus/Flash"
    echo "iFlow: GLM-4.7, Kimi-K2, DeepSeek"
    echo "Antigravity: Gemini 3 Pro preview"
    echo "GitHub Copilot: Device code flow"
    echo "GitLab Duo: OAuth or token"
    echo "Kilo AI: Device code flow"
    echo "Kimi: Moonshot AI"
    echo "Kiro: AWS Builder IDE"
}

show_menu() {
    echo -e "\n${BLUE}═════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  Google:${NC}     1) Gemini    2) Gemini (Incognito)"
    echo -e "${CYAN}  Anthropic:${NC}  3) Claude Code"
    echo -e "${CYAN}  OpenAI:${NC}     4) Codex     5) Codex (Device)"
    echo -e "${CYAN}  Alibaba:${NC}    6) Qwen Code"
    echo -e "${CYAN}  iFlow:${NC}      7) iFlow     8) iFlow (Cookie)"
    echo -e "${CYAN}  Antigravity:${NC} 9) Antigravity"
    echo -e "${CYAN}  GitHub:${NC}    10) GitHub Copilot"
    echo -e "${CYAN}  GitLab:${NC}    11) GitLab   12) GitLab (Token)"
    echo -e "${CYAN}  Others:${NC}     13) Kilo AI  14) Kimi"
    echo -e "${CYAN}  Kiro:${NC}       15) Google   16) AWS Device  17) AWS Auth  18) Import"
    echo -e "${BLUE}───────────────────────────────────────────────────────${NC}"
    echo "  s) Status   h) Help   q) Quit"
    echo -e "${BLUE}═════════════════════════════════════════════════════════${NC}"
}

main() {
    print_banner
    get_pod_name
    
    while true; do
        show_menu
        read -p "Select: " choice
        
        case $choice in
            1)  login_gemini ;;
            2)  login_gemini_incognito ;;
            3)  login_claude ;;
            4)  login_codex ;;
            5)  login_codex_device ;;
            6)  login_qwen ;;
            7)  login_iflow ;;
            8)  login_iflow_cookie ;;
            9)  login_antigravity ;;
            10) login_github_copilot ;;
            11) login_gitlab ;;
            12) login_gitlab_token ;;
            13) login_kilo ;;
            14) login_kimi ;;
            15) login_kiro_google ;;
            16) login_kiro_aws ;;
            17) login_kiro_aws_authcode ;;
            18) login_kiro_import ;;
            s|S) show_status ;;
            h|H) show_help ;;
            q|Q) echo -e "${GREEN}Bye!${NC}"; exit 0 ;;
            *)  echo -e "${RED}Invalid: $choice${NC}" ;;
        esac
        
        echo ""
        read -p "Press Enter..."
    done
}

main "$@"
