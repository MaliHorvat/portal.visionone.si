#!/bin/bash
set -eu

LOG="/var/log/visionone-install.log"
exec >>"$LOG" 2>&1
echo "=== VisionOne install $(date -Iseconds) ==="

apt-get update -qq || true
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3 curl ca-certificates || true

mkdir -p /opt/visionone-agent /var/lib/visionone-agent /etc/visionone
CLAIM="/opt/visionone-agent/visionone-claim.txt"
if [ ! -f "$CLAIM" ]; then
  for f in /boot/firmware/visionone-claim.txt /boot/visionone-claim.txt; do
    [ -f "$f" ] && cp "$f" "$CLAIM" && break
  done
fi
if [ ! -f "$CLAIM" ]; then
  echo "Manjka visionone-claim.txt"
  exit 1
fi

# Beri key=value
get_kv() {
  grep -E "^${1}=" "$CLAIM" | head -1 | cut -d= -f2- | tr -d '\r'
}
PORTAL="$(get_kv portal_base_url)"
CODE="$(get_kv claim_code)"
AGENT_NAME="$(get_kv agent_name)"
SITE_LABEL="$(get_kv site_label)"

if [ -z "$PORTAL" ] || [ -z "$CODE" ]; then
  echo "Manjka portal_base_url ali claim_code"
  exit 1
fi

PAYLOAD=$(printf '{"claimCode":"%s","agentName":"%s","siteLabel":"%s"}' "$CODE" "$AGENT_NAME" "$SITE_LABEL")
RESP=$(curl -fsS -X POST "${PORTAL%/}/api/telemetry/claim" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD") || { echo "Claim API ni uspel"; exit 1; }

echo "$RESP" > /etc/visionone/claim-response.json
python3 - <<'PY'
import json, pathlib
raw = pathlib.Path("/etc/visionone/claim-response.json").read_text(encoding="utf-8")
data = json.loads(raw)
cfg = data.get("config") or {}
pathlib.Path("/etc/visionone/agent.json").write_text(json.dumps(cfg, indent=2), encoding="utf-8")
print("agent_id", cfg.get("agent_id"))
PY

# Agent skripta (že v /opt/visionone-agent iz ZIP opt mape)
chmod +x /opt/visionone-agent/visionone_agent.py

cat > /etc/systemd/system/visionone-agent.service <<'UNIT'
[Unit]
Description=VisionOne edge agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/visionone-agent/visionone_agent.py
Restart=always
RestartSec=15
User=root

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable visionone-agent.service
systemctl restart visionone-agent.service

# Onemogoči ponovni firstrun
if [ -f /boot/firmware/firstrun.sh ]; then rm -f /boot/firmware/firstrun.sh; fi
if [ -f /boot/firstrun.sh ]; then rm -f /boot/firstrun.sh; fi

echo "VisionOne agent nameščen."
