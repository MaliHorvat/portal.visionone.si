#!/bin/bash
set -euo pipefail

INSTALL_DIR="/opt/visionone-vms-gateway"
ENV_FILE="${INSTALL_DIR}/.env"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Zaženi kot root: sudo bash install-cloudflared.sh"
  exit 1
fi

install_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then
    echo "cloudflared je že nameščen: $(cloudflared --version 2>&1 | head -1)"
    return 0
  fi

  if command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
    codename="$(. /etc/os-release && echo "${VERSION_CODENAME:-bookworm}")"
    echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared ${codename} main" \
      > /etc/apt/sources.list.d/cloudflared.list
    apt-get update -qq
    apt-get install -y cloudflared
    return 0
  fi

  arch="$(uname -m)"
  case "$arch" in
    aarch64|arm64) bin="cloudflared-linux-arm64" ;;
    armv7l|armv6l) bin="cloudflared-linux-arm" ;;
    x86_64|amd64) bin="cloudflared-linux-amd64" ;;
    *)
      echo "Nepodprta arhitektura: $arch"
      exit 1
      ;;
  esac

  curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/${bin}" -o /usr/local/bin/cloudflared
  chmod +x /usr/local/bin/cloudflared
}

install_cloudflared

token=""
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a && source "$ENV_FILE" && set +a
  token="${CLOUDFLARE_TUNNEL_TOKEN:-}"
fi

if [[ -n "$token" ]]; then
  echo "Nameščam Cloudflare Tunnel storitev (token iz .env)…"
  cloudflared service uninstall >/dev/null 2>&1 || true
  cloudflared service install "$token"
  systemctl enable cloudflared
  systemctl restart cloudflared
  echo "Cloudflare Tunnel teče. Preveri: systemctl status cloudflared"
else
  echo "CLOUDFLARE_TUNNEL_TOKEN ni v ${ENV_FILE}."
  echo "Ko ustvariš tunel v Cloudflare Zero Trust, token dodaš v .env in ponovno zaženeš:"
  echo "  sudo bash install-cloudflared.sh"
fi
