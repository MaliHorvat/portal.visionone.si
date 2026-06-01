#!/usr/bin/env python3
"""VisionOne edge agent — ping naprav in pošiljanje stanja v portal (moj.visionone.si)."""
from __future__ import annotations

import argparse
import json
import socket
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

CONFIG_PATH = Path("/etc/visionone/agent.json")
SPOOL = Path("/var/lib/visionone-agent/spool.jsonl")

# ANSI barve (Windows Terminal / PowerShell / Linux)
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


def load_config(path: Path) -> dict:
    if not path.is_file():
        raise SystemExit(f"Manjka config: {path}\nNamestite agent (install.sh) ali uporabite --config lokalna.json")
    return json.loads(path.read_text(encoding="utf-8"))


def http_json(method: str, url: str, token: str, body: dict | None = None, timeout: int = 12) -> dict:
    data = None
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def tcp_probe(ip: str, port: int, timeout: float) -> tuple[bool, int | None, str]:
    try:
        t0 = time.monotonic()
        with socket.create_connection((ip, port), timeout=timeout):
            ms = int((time.monotonic() - t0) * 1000)
        return True, ms, ""
    except OSError as exc:
        return False, None, str(exc)


def fetch_targets(cfg: dict) -> list[dict]:
    base = cfg["portal_base_url"].rstrip("/")
    agent_id = cfg["agent_id"]
    url = f"{base}{cfg.get('targets_path', '/api/telemetry/targets')}?agentId={agent_id}"
    data = http_json("GET", url, cfg["token"], timeout=int(cfg.get("request_timeout_seconds", 8)))
    return list(data.get("targets") or [])


def probe_targets(cfg: dict, targets: list[dict]) -> list[dict]:
    timeout = float(cfg.get("request_timeout_seconds", 8))
    out: list[dict] = []
    for t in targets:
        ip = str(t.get("ip", "")).strip()
        if not ip:
            continue
        port = int(t.get("port") or 80)
        ok, ms, err = tcp_probe(ip, port, timeout)
        out.append(
            {
                "key": str(t.get("key", ip)),
                "name": str(t.get("name", ip)),
                "ip": ip,
                "kind": str(t.get("kind", "other")),
                "status": "online" if ok else "offline",
                "reachable": ok,
                "latencyMs": ms,
                "error": err,
            }
        )
    if not out:
        out.append(
            {
                "key": "agent:local",
                "name": cfg.get("agent_name", "VisionOne Agent"),
                "ip": "127.0.0.1",
                "kind": "host",
                "status": "online",
                "reachable": True,
                "latencyMs": 0,
                "error": "",
            }
        )
    return out


def ingest(cfg: dict, devices: list[dict]) -> dict:
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
    return http_json("POST", url, cfg["token"], body, timeout=int(cfg.get("request_timeout_seconds", 12)))


def print_report(devices: list[dict], ingest_ok: bool, ingest_err: str = "") -> None:
    online = sum(1 for d in devices if d.get("reachable"))
    offline = len(devices) - online
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print()
    print(f"{BOLD}{CYAN}=== VisionOne monitoring ==={RESET}  {ts}")
    print(f"Agent: {devices[0].get('name', '') if devices else '—'}")
    print()

    for d in devices:
        ok = bool(d.get("reachable"))
        mark = f"{GREEN}OK{RESET}" if ok else f"{RED}IZPAD{RESET}"
        ms = d.get("latencyMs")
        lat = f"  {ms} ms" if ms is not None else ""
        err = d.get("error") or ""
        err_s = f"  {YELLOW}({err}){RESET}" if err and not ok else ""
        print(f"  [{mark}]  {d.get('name', '?')}  ({d.get('kind', '')})  {d.get('ip', '')}{lat}{err_s}")

    print()
    if offline == 0:
        print(f"{GREEN}{BOLD}Vse naprave dosegljive ({online}/{len(devices)}){RESET}")
    else:
        print(f"{RED}{BOLD}POZOR: {offline} naprav ni dosegljivih ({online}/{len(devices)} OK){RESET}")
    if ingest_ok:
        print(f"{GREEN}Portal: podatki poslani ✓{RESET}")
    else:
        print(f"{RED}Portal: pošiljanje NI uspelo — {ingest_err}{RESET}")
    print()


def run_cycle(cfg: dict, verbose: bool = True) -> int:
    """En cikel: preberi tarče, ping, pošlji. Vrne 0 če vse OK, 1 če izpad ali napaka."""
    try:
        targets = fetch_targets(cfg)
    except urllib.error.URLError as exc:
        if verbose:
            print(f"{RED}Napaka: ni mogoče prebrati tarč iz portala — {exc}{RESET}")
        return 1

    devices = probe_targets(cfg, targets)
    ingest_ok = False
    ingest_err = ""
    try:
        ingest(cfg, devices)
        ingest_ok = True
    except urllib.error.URLError as exc:
        ingest_err = str(exc)

    if verbose:
        print_report(devices, ingest_ok, ingest_err)

    offline = sum(1 for d in devices if not d.get("reachable"))
    if offline or not ingest_ok:
        return 1
    return 0


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
                ok, ms, _ = tcp_probe(ip, port, float(cfg.get("request_timeout_seconds", 8)))
                result = {"ip": ip, "port": port, "status": "online" if ok else "offline", "latencyMs": ms}
        except Exception as exc:  # noqa: BLE001
            result = {"ok": False, "error": str(exc)}
        tpl = cfg.get("jobs_result_path_template", "/api/telemetry/jobs/{id}/result")
        result_url = f"{base}{tpl.replace('{id}', str(jid))}"
        http_json("POST", result_url, cfg["token"], {"ok": True, "result": result})


def loop_forever(cfg: dict) -> None:
    interval = int(cfg.get("interval_seconds", 60))
    targets_every = int(cfg.get("targets_refresh_every", 5))
    jobs_every = int(cfg.get("jobs_poll_every", 1))
    cycle = 0
    print(f"{CYAN}VisionOne agent — zanka vsak {interval}s (Ctrl+C za ustavitev){RESET}\n")
    while True:
        try:
            run_cycle(cfg, verbose=True)
            if cycle % jobs_every == 0:
                run_jobs(cfg)
            if cycle % max(targets_every, 1) == 0:
                try:
                    rc_url = f"{cfg['portal_base_url'].rstrip('/')}/api/telemetry/runtime-config?agentId={cfg['agent_id']}"
                    rc = http_json("GET", rc_url, cfg["token"])
                    if rc.get("config"):
                        merged = {
                            **cfg,
                            **rc["config"],
                            "portal_base_url": cfg["portal_base_url"],
                            "token": cfg["token"],
                            "agent_id": cfg["agent_id"],
                        }
                        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
                        CONFIG_PATH.write_text(json.dumps(merged, indent=2), encoding="utf-8")
                        cfg = merged
                except urllib.error.URLError:
                    pass
        except Exception as exc:  # noqa: BLE001
            print(f"{RED}Napaka v zanki: {exc}{RESET}")
            SPOOL.parent.mkdir(parents=True, exist_ok=True)
            with SPOOL.open("a", encoding="utf-8") as f:
                f.write(json.dumps({"at": time.time(), "error": str(exc)}) + "\n")
        cycle += 1
        time.sleep(interval)


def main() -> None:
    parser = argparse.ArgumentParser(description="VisionOne Raspberry Pi monitoring agent")
    parser.add_argument(
        "--config",
        type=Path,
        default=CONFIG_PATH,
        help="Pot do agent.json (privzeto /etc/visionone/agent.json)",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="En sam cikel (priporočeno za test v CMD), nato izhod",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Brez izpisa v terminal (samo exit code)",
    )
    args = parser.parse_args()

    cfg = load_config(args.config)

    if args.once:
        code = run_cycle(cfg, verbose=not args.quiet)
        sys.exit(code)

    loop_forever(cfg)


if __name__ == "__main__":
    main()
