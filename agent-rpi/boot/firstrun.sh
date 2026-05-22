#!/bin/bash
# VisionOne — enkratni zagon ob prvem bootu (Raspberry Pi OS).
set -eu

LOG="/var/log/visionone-firstrun.log"
exec >>"$LOG" 2>&1
echo "=== VisionOne firstrun $(date -Iseconds) ==="

BOOT=""
for d in /boot/firmware /boot; do
  [ -f "$d/visionone-claim.txt" ] && BOOT="$d" && break
done
if [ -z "$BOOT" ]; then
  echo "Ni visionone-claim.txt"
  exit 1
fi

mkdir -p /opt/visionone-agent
cp "$BOOT/visionone-claim.txt" /opt/visionone-agent/visionone-claim.txt

if [ -d "$BOOT/opt/visionone-agent" ]; then
  cp -r "$BOOT/opt/visionone-agent/"* /opt/visionone-agent/
fi

chmod +x /opt/visionone-agent/install.sh 2>/dev/null || true
chmod +x /boot/firmware/visionone-agent-install.sh 2>/dev/null || true
chmod +x /boot/visionone-agent-install.sh 2>/dev/null || true

if [ -x /opt/visionone-agent/install.sh ]; then
  /opt/visionone-agent/install.sh
elif [ -x "$BOOT/visionone-agent-install.sh" ]; then
  cp "$BOOT/visionone-agent-install.sh" /opt/visionone-agent/install.sh
  chmod +x /opt/visionone-agent/install.sh
  /opt/visionone-agent/install.sh
else
  echo "Manjka install.sh"
  exit 1
fi
