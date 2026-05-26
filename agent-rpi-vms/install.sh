#!/bin/bash
set -euo pipefail

INSTALL_DIR="/opt/visionone-vms-gateway"
SERVICE_NAME="visionone-vms-gateway"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Zaženi kot root: sudo bash install.sh"
  exit 1
fi

mkdir -p "$INSTALL_DIR"
cp "$SCRIPT_DIR/visionone_vms_gateway.py" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/.env" "$INSTALL_DIR/"
chmod 600 "$INSTALL_DIR/.env"

cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=VisionOne VMS Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
ExecStart=/usr/bin/python3 ${INSTALL_DIR}/visionone_vms_gateway.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"
echo "VisionOne VMS gateway nameščen v ${INSTALL_DIR}. Status: systemctl status ${SERVICE_NAME}"
