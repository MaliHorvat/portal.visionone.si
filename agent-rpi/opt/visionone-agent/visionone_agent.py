#!/usr/bin/env python3
"""VisionOne edge agent — ping tarč stranke in pošiljanje v portal."""
from __future__ import annotations

import json
import socket
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

CONFIG_PATH = Path("/etc/visionone/agent.json")
SPOOL = Path("/var/lib/visionone-agent/spool.jsonl")


def load_config() -> dict:
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def http_json(method: str, url: str, token: str, body: dict | None = None, timeout: int = 12) -> dict:
    data = None
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def tcp_probe(ip: str, port: int, timeout: float) -> tuple[str, int | None]:
    try:
        t0 = time.monotonic()
        with socket.create_connection((ip, port), timeout=timeout):
            ms = int((time.monotonic() - t0) * 1000)
        return "online", ms
    except OSError:
        return "offline", None


def probe_targets(cfg: dict) -> list[dict]:
    base = cfg["portal_base_url"].rstrip("/")
    token = cfg["token"]
    agent_id = cfg["agent_id"]
    url = f"{base}{cfg.get('targets_path', '/api/telemetry/targets')}?agentId={agent_id}"
    try:
        data = http_json("GET", url, token, timeout=int(cfg.get("request_timeout_seconds", 8)))
    except (urllib.error.URLError, json.JSONDecodeError, KeyError):
        return [
            {
                "key": "agent:local",
                "name": cfg.get("agent_name", "Agent"),
                "ip": "127.0.0.1",
                "kind": "host",
                "status": "online",
                "latencyMs": 0,
            }
        ]
    out: list[dict] = []
    timeout = float(cfg.get("request_timeout_seconds", 8))
    for t in data.get("targets") or []:
        ip = str(t.get("ip", "")).strip()
        if not ip:
            continue
        port = int(t.get("port") or 80)
        status, ms = tcp_probe(ip, port, timeout)
        out.append(
            {
                "key": str(t.get("key", ip)),
                "name": str(t.get("name", ip)),
                "ip": ip,
                "kind": str(t.get("kind", "other")),
                "status": status,
                "latencyMs": ms,
            }
        )
    if not out:
        out.append(
            {
                "key": "agent:local",
                "name": cfg.get("agent_name", "Agent"),
                "ip": "127.0.0.1",
                "kind": "host",
                "status": "online",
                "latencyMs": 0,
            }
        )
    return out


def ingest(cfg: dict, devices: list[dict]) -> None:
    base = cfg["portal_base_url"].rstrip("/")
    path = cfg.get("ingest_path", "/api/telemetry/ingest")
    url = f"{base}{path}"
    body = {
        "agentId": cfg["agent_id"],
        "agentName": cfg.get("agent_name", "VisionOne Agent"),
        "siteLabel": cfg.get("site_label", ""),
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "devices": devices,
    }
    http_json("POST", url, cfg["token"], body, timeout=int(cfg.get("request_timeout_seconds", 8)))


def run_jobs(cfg: dict) -> None:
    base = cfg["portal_base_url"].rstrip("/")
    agent_id = cfg["agent_id"]
    poll_url = f"{base}{cfg.get('jobs_poll_path', '/api/telemetry/jobs/poll')}?agentId={agent_id}"
    try:
        data = http_json("GET", poll_url, cfg["token"])
    except urllib.error.URLError:
        return
    for job in data.get("jobs") or []:
        jid = job.get("id")
        jtype = job.get("type")
        payload = job.get("payload") or {}
        result: dict = {"ok": True}
        try:
            if jtype == "ping":
                ip = str(payload.get("ip", "")).strip()
                port = int(payload.get("port") or 80)
                status, ms = tcp_probe(ip, port, float(cfg.get("request_timeout_seconds", 8)))
                result = {"ip": ip, "port": port, "status": status, "latencyMs": ms}
            elif jtype == "scan":
                prefix = str(payload.get("prefix", "192.168.1")).strip()
                start = int(payload.get("start") or 1)
                end = int(payload.get("end") or 40)
                port = int(payload.get("port") or 80)
                found = []
                for host in range(start, end + 1):
                    ip = f"{prefix}.{host}"
                    status, _ = tcp_probe(ip, port, 1.5)
                    if status == "online":
                        found.append(ip)
                result = {"found": found, "count": len(found)}
        except Exception as exc:  # noqa: BLE001
            result = {"ok": False, "error": str(exc)}
        tpl = cfg.get("jobs_result_path_template", "/api/telemetry/jobs/{id}/result")
        result_url = f"{base}{tpl.replace('{id}', str(jid))}"
        http_json("POST", result_url, cfg["token"], {"ok": True, "result": result})


def main() -> None:
    if not CONFIG_PATH.is_file():
        raise SystemExit("Manjka /etc/visionone/agent.json — najprej zaženite install.sh")
    cfg = load_config()
    interval = int(cfg.get("interval_seconds", 60))
    targets_every = int(cfg.get("targets_refresh_every", 5))
    jobs_every = int(cfg.get("jobs_poll_every", 1))
    cycle = 0
    while True:
        try:
            devices = probe_targets(cfg)
            ingest(cfg, devices)
            if cycle % jobs_every == 0:
                run_jobs(cfg)
            # Osveži config občasno
            if cycle % max(targets_every, 1) == 0:
                try:
                    rc_url = f"{cfg['portal_base_url'].rstrip('/')}/api/telemetry/runtime-config?agentId={cfg['agent_id']}"
                    rc = http_json("GET", rc_url, cfg["token"])
                    if rc.get("config"):
                        merged = {**cfg, **rc["config"], "portal_base_url": cfg["portal_base_url"], "token": cfg["token"], "agent_id": cfg["agent_id"]}
                        CONFIG_PATH.write_text(json.dumps(merged, indent=2), encoding="utf-8")
                        cfg = merged
                except urllib.error.URLError:
                    pass
        except Exception as exc:  # noqa: BLE001
            SPOOL.parent.mkdir(parents=True, exist_ok=True)
            with SPOOL.open("a", encoding="utf-8") as f:
                f.write(json.dumps({"at": time.time(), "error": str(exc)}) + "\n")
        cycle += 1
        time.sleep(interval)


if __name__ == "__main__":
    main()
