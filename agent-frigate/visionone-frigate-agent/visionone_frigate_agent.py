#!/usr/bin/env python3
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


PORTAL_BASE_URL = env("PORTAL_BASE_URL").rstrip("/")
CLAIM_CODE = env("CLAIM_CODE")
AGENT_NAME = env("AGENT_NAME", "VisionOne Frigate Edge")
SITE_LABEL = env("SITE_LABEL")
FRIGATE_URL = env("FRIGATE_URL", "http://frigate:5000").rstrip("/")
POLL_SECONDS = max(10, int(env("VISIONONE_POLL_SECONDS", "30") or "30"))
CONFIG_FILE = Path(env("VISIONONE_CONFIG_FILE", "/data/visionone-frigate-agent.json"))


def request_json(method: str, url: str, payload=None, token: str = "", timeout: int = 10):
    data = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as res:
        raw = res.read().decode("utf-8")
        return json.loads(raw) if raw else {}


def load_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
    return {}


def save_config(config: dict) -> None:
    CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(config, indent=2), encoding="utf-8")


def claim_config() -> dict:
    if not PORTAL_BASE_URL:
        raise RuntimeError("PORTAL_BASE_URL is required")
    if not CLAIM_CODE:
        raise RuntimeError("CLAIM_CODE is required before first claim")

    response = request_json(
        "POST",
        f"{PORTAL_BASE_URL}/api/telemetry/claim",
        {"claimCode": CLAIM_CODE, "agentName": AGENT_NAME, "siteLabel": SITE_LABEL},
    )
    config = response.get("config") or {}
    if not config.get("token") or not config.get("agent_id"):
        raise RuntimeError("Claim response did not include token/agent_id")
    save_config(config)
    return config


def ensure_config() -> dict:
    config = load_config()
    if config.get("token") and config.get("agent_id"):
        return config
    return claim_config()


def fetch_frigate(path: str):
    return request_json("GET", f"{FRIGATE_URL}{path}", timeout=8)


def get_frigate_version(stats) -> str:
    if isinstance(stats, dict):
        service = stats.get("service") if isinstance(stats.get("service"), dict) else {}
        version = service.get("version") or stats.get("version")
        return str(version or "")
    return ""


def normalize_events(raw) -> list[dict]:
    if isinstance(raw, dict):
        candidates = raw.get("events") or raw.get("data") or []
    else:
        candidates = raw
    if not isinstance(candidates, list):
        return []

    normalized = []
    for event in candidates:
        if not isinstance(event, dict):
            continue
        event_id = str(event.get("id") or event.get("event_id") or "").strip()
        camera = str(event.get("camera") or "").strip()
        if not event_id or not camera:
            continue
        zones = event.get("zones")
        zone = zones[0] if isinstance(zones, list) and zones else event.get("zone", "")
        normalized.append(
            {
                "frigateEventId": event_id,
                "frigateCameraKey": camera,
                "eventType": str(event.get("type") or "object"),
                "label": str(event.get("label") or event.get("sub_label") or ""),
                "score": event.get("top_score") or event.get("score"),
                "zone": str(zone or ""),
                "severity": "info",
                "startedAt": event.get("start_time") or event.get("startTime") or event.get("started_at"),
                "endedAt": event.get("end_time") or event.get("endTime") or event.get("ended_at"),
                "snapshotUrl": f"{FRIGATE_URL}/api/events/{urllib.parse.quote(event_id)}/snapshot.jpg",
                "clipUrl": f"{FRIGATE_URL}/api/events/{urllib.parse.quote(event_id)}/clip.mp4",
                "data": event,
            }
        )
    return normalized


def send_ingest(config: dict, stats, events: list[dict]) -> None:
    portal = str(config.get("portal_base_url") or PORTAL_BASE_URL).rstrip("/")
    token = str(config["token"])
    agent_id = str(config["agent_id"])
    payload = {
        "agentId": agent_id,
        "agentName": str(config.get("agent_name") or AGENT_NAME),
        "siteLabel": str(config.get("site_label") or SITE_LABEL),
        "checkedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "edge": {
            "externalId": f"{agent_id}-frigate",
            "name": "Frigate NVR",
            "frigateUrl": FRIGATE_URL,
            "status": "online",
            "version": get_frigate_version(stats),
            "storagePath": "/media/frigate",
        },
        "events": events,
    }
    request_json("POST", f"{portal}/api/vms/ingest", payload, token=token, timeout=15)


def main() -> None:
    config = ensure_config()
    print("VisionOne Frigate agent started", flush=True)
    while True:
        try:
            stats = fetch_frigate("/api/stats")
            try:
                raw_events = fetch_frigate("/api/events?limit=25")
            except urllib.error.HTTPError:
                raw_events = []
            send_ingest(config, stats, normalize_events(raw_events))
        except Exception as exc:
            print(f"visionone-frigate-agent error: {exc}", flush=True)
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()

