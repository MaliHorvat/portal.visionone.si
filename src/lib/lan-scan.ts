/** Brskalniški LAN sken — deluje le na isti Wi‑Fi/LAN kot naprava uporabnika. */

export const LAN_SCAN_PORTS = [80, 443, 554, 8000, 8080, 37777, 22, 23, 5000, 9000] as const;

/** Manj vrat in nižja vzporednost — bolj zanesljivo na telefonu (baterija, omejitve brskalnika). */
export const LAN_SCAN_PORTS_MOBILE = [80, 443, 554, 8000, 8080, 37777] as const;

export type LanScanProfile = {
  maxHosts: number;
  concurrency: number;
  timeoutMs: number;
  ports: readonly number[];
};

export function getLanScanProfile(mobile: boolean): LanScanProfile {
  if (mobile) {
    return {
      maxHosts: 128,
      concurrency: 8,
      timeoutMs: 1200,
      ports: LAN_SCAN_PORTS_MOBILE,
    };
  }
  return {
    maxHosts: 512,
    concurrency: 20,
    timeoutMs: 850,
    ports: LAN_SCAN_PORTS,
  };
}

/** Krajši obseg za hitrejši sken na telefonu (npr. .1–.64). */
export function suggestQuickScanRange(localIp: string): { start: string; end: string } | null {
  const full = suggestSubnetRange(localIp);
  if (!full) return null;
  const parts = localIp.split(".").map(Number);
  const base = `${parts[0]}.${parts[1]}.${parts[2]}`;
  return { start: `${base}.1`, end: `${base}.64` };
}

export type LanScanHost = {
  ip: string;
  openPorts: number[];
  deviceHint: string;
  latencyMs: number;
};

export type LanScanProgress = {
  done: number;
  total: number;
  currentIp?: string;
};

const PRIVATE_RE =
  /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/;

export function isValidIpv4(ip: string): boolean {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false;
    const n = Number(p);
    return n >= 0 && n <= 255;
  });
}

export function ipToLong(ip: string): number | null {
  if (!isValidIpv4(ip)) return null;
  const [a, b, c, d] = ip.split(".").map(Number);
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

export function longToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}

export function buildIpRange(start: string, end: string, maxHosts = 512): string[] {
  const s = ipToLong(start);
  const e = ipToLong(end);
  if (s === null || e === null || s > e) return [];
  const count = e - s + 1;
  if (count > maxHosts) {
    const capped = s + maxHosts - 1;
    const out: string[] = [];
    for (let i = s; i <= capped; i++) out.push(longToIp(i));
    return out;
  }
  const out: string[] = [];
  for (let i = s; i <= e; i++) out.push(longToIp(i));
  return out;
}

export function suggestSubnetRange(localIp: string): { start: string; end: string } | null {
  if (!isValidIpv4(localIp)) return null;
  const parts = localIp.split(".").map(Number);
  const base = `${parts[0]}.${parts[1]}.${parts[2]}`;
  return { start: `${base}.1`, end: `${base}.254` };
}

export function guessDeviceHint(openPorts: number[]): string {
  const p = new Set(openPorts);
  if (p.has(554)) return "RTSP (kamera / NVR)";
  if (p.has(37777)) return "Dahua (tipičen port)";
  if (p.has(8000) && (p.has(80) || p.has(443))) return "IP kamera / NVR (spletni vmesnik)";
  if (p.has(80) || p.has(443) || p.has(8080)) return "Spletni vmesnik / HTTP";
  if (p.has(22)) return "SSH strežnik";
  if (p.has(23)) return "Telnet";
  if (p.has(5000) || p.has(9000)) return "Omrežna aplikacija / NVR";
  if (openPorts.length > 0) return "Odzivna naprava";
  return "Odzivna (brez znanih vrat)";
}

type ProbeResult = "open" | "reachable" | "timeout";

async function probePort(ip: string, port: number, timeoutMs: number, signal?: AbortSignal): Promise<ProbeResult> {
  if (signal?.aborted) return "timeout";
  const https = port === 443 || port === 8443;
  const url = `${https ? "https" : "http"}://${ip}:${port}/`;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();
  try {
    await fetch(url, {
      mode: "no-cors",
      signal: controller.signal,
      cache: "no-store",
    });
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
    return "open";
  } catch {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
    const elapsed = performance.now() - start;
    if (controller.signal.aborted && elapsed >= timeoutMs * 0.85) return "timeout";
    return "reachable";
  }
}

async function scanSingleHost(
  ip: string,
  ports: readonly number[],
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<LanScanHost | null> {
  if (signal?.aborted) return null;
  const t0 = performance.now();
  const openPorts: number[] = [];
  let anyResponse = false;

  const chunkSize = 4;
  for (let i = 0; i < ports.length; i += chunkSize) {
    if (signal?.aborted) return null;
    const chunk = ports.slice(i, i + chunkSize);
    const results = await Promise.all(chunk.map((port) => probePort(ip, port, timeoutMs, signal)));
    results.forEach((r, idx) => {
      const port = chunk[idx];
      if (r === "open") {
        openPorts.push(port);
        anyResponse = true;
      } else if (r === "reachable") {
        anyResponse = true;
      }
    });
    if (anyResponse && openPorts.length >= 2) break;
  }

  if (!anyResponse) return null;
  return {
    ip,
    openPorts: [...new Set(openPorts)].sort((a, b) => a - b),
    deviceHint: guessDeviceHint(openPorts),
    latencyMs: Math.round(performance.now() - t0),
  };
}

export async function detectLocalIpViaWebRtc(timeoutMs = 3500): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const RTC =
    window.RTCPeerConnection ||
    (window as unknown as { webkitRTCPeerConnection?: typeof RTCPeerConnection }).webkitRTCPeerConnection;
  if (!RTC) return null;

  return new Promise((resolve) => {
    const found = new Set<string>();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        pc.close();
      } catch {
        /* ignore */
      }
      const priv = [...found].find((ip) => PRIVATE_RE.test(ip));
      resolve(priv ?? [...found][0] ?? null);
    };

    const pc = new RTC({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.createDataChannel("vo-lan-scan");
    pc.onicecandidate = (ev) => {
      if (!ev.candidate) {
        finish();
        return;
      }
      const m = ev.candidate.candidate.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
      if (m?.[1] && !m[1].endsWith(".0.0.0") && m[1] !== "0.0.0.0") found.add(m[1]);
    };
    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch(() => finish());
    window.setTimeout(finish, timeoutMs);
  });
}

export async function scanLanRange(
  ips: string[],
  options?: {
    ports?: readonly number[];
    timeoutMs?: number;
    concurrency?: number;
    onProgress?: (p: LanScanProgress) => void;
    signal?: AbortSignal;
  },
): Promise<LanScanHost[]> {
  const ports = options?.ports ?? LAN_SCAN_PORTS;
  const timeoutMs = options?.timeoutMs ?? 900;
  const concurrency = Math.max(1, Math.min(options?.concurrency ?? 18, 40));
  const total = ips.length;
  const hosts: LanScanHost[] = [];
  let done = 0;

  const queue = [...ips];
  const workers = Array.from({ length: Math.min(concurrency, queue.length || 1) }, async () => {
    while (queue.length > 0) {
      if (options?.signal?.aborted) return;
      const ip = queue.shift();
      if (!ip) return;
      options?.onProgress?.({ done, total, currentIp: ip });
      const host = await scanSingleHost(ip, ports, timeoutMs, options?.signal);
      done += 1;
      options?.onProgress?.({ done, total, currentIp: ip });
      if (host) hosts.push(host);
    }
  });

  await Promise.all(workers);
  hosts.sort((a, b) => (ipToLong(a.ip) ?? 0) - (ipToLong(b.ip) ?? 0));
  return hosts;
}
