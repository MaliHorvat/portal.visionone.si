#!/usr/bin/env python3
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


PORTAL_BASE_URL = env("PORTAL_BASE_URL").rstrip("/")
CLAIM_CODE = env("CLAIM_CODE")
AGENT_NAME = env("AGENT_NAME", "VisionOne Kerberos Edge")
SITE_LABEL = env("SITE_LABEL")
KERBEROS_URL = env("KERBEROS_URL", "http://kerberos-agent:80").rstrip("/")
KERBEROS_PUBLIC_URL = env("KERBEROS_PUBLIC_URL", KERBEROS_URL).rstrip("/")
KERBEROS_USERNAME = env("KERBEROS_USERNAME")
KERBEROS_PASSWORD = env("KERBEROS_PASSWORD")
POLL_SECONDS = max(10, int(env("VISIONONE_POLL_SECONDS", "30") or "30"))
CONFIG_FILE = Path(env("VISIONONE_CONFIG_FILE", "/data/visionone-kerberos-agent.json"))


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
    if not CONFIG_FILE.exists():
        return {}
    try:
        return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
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


def kerberos_login() -> str:
    if not KERBEROS_USERNAME or not KERBEROS_PASSWORD:
        return ""
    try:
        response = request_json(
            "POST",
            f"{KERBEROS_URL}/api/login",
            {"username": KERBEROS_USERNAME, "password": KERBEROS_PASSWORD},
            timeout=8,
        )
    except urllib.error.HTTPError:
        return ""
    return str(response.get("token") or response.get("access_token") or response.get("jwt") or "")


def kerberos_latest_events(token: str):
    filters = [
        {"limit": 25},
        {"numberOfElements": 25},
        {},
    ]
    last_error = None
    for payload in filters:
        try:
            return request_json("POST", f"{KERBEROS_URL}/api/latest-events", payload, token=token, timeout=12)
        except Exception as exc:
            last_error = exc
    raise RuntimeError(f"Unable to read Kerberos latest events: {last_error}")


def as_list(raw) -> list:
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        for key in ("events", "recordings", "data", "latestEvents"):
            value = raw.get(key)
            if isinstance(value, list):
                return value
    return []


def first_value(event: dict, keys: tuple[str, ...], default=""):
    for key in keys:
        value = event.get(key)
        if value not in (None, ""):
            return value
    return default


def normalize_events(raw) -> list[dict]:
    normalized = []
    for event in as_list(raw):
        if not isinstance(event, dict):
            continue
        event_id = str(first_value(event, ("id", "key", "name", "path", "recording"), "")).strip()
        camera = str(first_value(event, ("camera", "cameraName", "agent", "source"), AGENT_NAME)).strip()
        if not event_id:
            continue
        file_path = str(first_value(event, ("path", "file", "filename", "recording"), "")).strip()
        media_url = ""
        if file_path.startswith("/"):
            media_url = f"{KERBEROS_PUBLIC_URL}/file{file_path}"
        normalized.append(
            {
                "frigateEventId": f"kerberos:{event_id}",
                "frigateCameraKey": camera,
                "kerberosCameraKey": camera,
                "eventType": str(first_value(event, ("type", "eventType"), "recording")),
                "label": str(first_value(event, ("label", "name"), "motion")),
                "score": event.get("score") or event.get("confidence"),
                "zone": str(first_value(event, ("zone", "region"), "")),
                "severity": "info",
                "startedAt": first_value(event, ("timestamp", "startTime", "startedAt", "createdAt", "date"), None),
                "endedAt": first_value(event, ("endTime", "endedAt"), None),
                "snapshotUrl": str(first_value(event, ("snapshotUrl", "thumbnail", "thumbnailUrl"), "")),
                "clipUrl": media_url or str(first_value(event, ("clipUrl", "videoUrl", "url"), "")),
                "data": event,
            }
        )
    return normalized


def send_ingest(config: dict, events: list[dict], last_error: str = "") -> None:
    portal = str(config.get("portal_base_url") or PORTAL_BASE_URL).rstrip("/")
    token = str(config["token"])
    agent_id = str(config["agent_id"])
    payload = {
        "provider": "kerberos",
        "agentId": agent_id,
        "agentName": str(config.get("agent_name") or AGENT_NAME),
        "siteLabel": str(config.get("site_label") or SITE_LABEL),
        "checkedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "edge": {
            "provider": "kerberos",
            "externalId": f"{agent_id}-kerberos",
            "name": "Kerberos Agent",
            "kerberosUrl": KERBEROS_PUBLIC_URL,
            "status": "online" if not last_error else "warn",
            "version": "",
            "storagePath": "/home/agent/data/recordings",
            "lastError": last_error,
        },
        "events": events,
    }
    request_json("POST", f"{portal}/api/vms/ingest", payload, token=token, timeout=15)


def main() -> None:
    config = ensure_config()
    kerberos_token = kerberos_login()
    print("VisionOne Kerberos collector started", flush=True)
    while True:
        try:
            raw_events = kerberos_latest_events(kerberos_token)
            send_ingest(config, normalize_events(raw_events))
        except Exception as exc:
            error = str(exc)
            print(f"visionone-kerberos-collector error: {error}", flush=True)
            try:
                send_ingest(config, [], last_error=error[:500])
            except Exception:
                pass
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()

