/** Predloge RTSP poti (main/sub) po proizvajalcu — shranjujejo se v CameraDefinition. */

export type RtspDefinitionSeed = {
  manufacturer: string;
  mainStream: string;
  subStream: string;
  /** Ključne besede v polju model (lowercase) za ujemanje. */
  aliases?: string[];
};

export const RTSP_DEFINITION_SEEDS: RtspDefinitionSeed[] = [
  {
    manufacturer: "Hikvision",
    mainStream: "/Streaming/Channels/{channel01}",
    subStream: "/Streaming/Channels/{channel02}",
    aliases: ["hik", "hikvision", "ds-2cd", "ds-2de", "ids-"],
  },
  {
    manufacturer: "HiLook",
    mainStream: "/Streaming/Channels/{channel01}",
    subStream: "/Streaming/Channels/{channel02}",
    aliases: ["hilook", "hil-"],
  },
  {
    manufacturer: "Honeywell",
    mainStream: "/Streaming/Channels/{channel01}",
    subStream: "/Streaming/Channels/{channel02}",
    aliases: ["honeywell", "hwd"],
  },
  {
    manufacturer: "LTS",
    mainStream: "/Streaming/Channels/{channel01}",
    subStream: "/Streaming/Channels/{channel02}",
    aliases: ["lts"],
  },
  {
    manufacturer: "Dahua",
    mainStream: "/cam/realmonitor?channel={channel}&subtype=0",
    subStream: "/cam/realmonitor?channel={channel}&subtype=1",
    aliases: ["dahua", "dh-", "ipc-hfw", "ipc-hdw"],
  },
  {
    manufacturer: "Amcrest",
    mainStream: "/cam/realmonitor?channel={channel}&subtype=0",
    subStream: "/cam/realmonitor?channel={channel}&subtype=1",
    aliases: ["amcrest"],
  },
  {
    manufacturer: "Lorex",
    mainStream: "/cam/realmonitor?channel={channel}&subtype=0",
    subStream: "/cam/realmonitor?channel={channel}&subtype=1",
    aliases: ["lorex"],
  },
  {
    manufacturer: "Milesight",
    mainStream: "/cam/realmonitor?channel={channel}&subtype=0",
    subStream: "/cam/realmonitor?channel={channel}&subtype=1",
    aliases: ["milesight"],
  },
  {
    manufacturer: "Uniview",
    mainStream: "/unicast/c{channel}/s0/live",
    subStream: "/unicast/c{channel}/s1/live",
    aliases: ["uniview", "ipc21", "ipc31", "ipc32"],
  },
  {
    manufacturer: "Reolink",
    mainStream: "/h264Preview_{channelPadded}_main",
    subStream: "/h264Preview_{channelPadded}_sub",
    aliases: ["reolink", "rlc-"],
  },
  {
    manufacturer: "Axis",
    mainStream: "/axis-media/media.amp",
    subStream: "/axis-media/media.amp?videocodec=h264&resolution=640x480",
    aliases: ["axis", "p13", "m30", "q61"],
  },
  {
    manufacturer: "Vivotek",
    mainStream: "/live.sdp",
    subStream: "/live2.sdp",
    aliases: ["vivotek", "ib", "fd", "sd"],
  },
  {
    manufacturer: "Hanwha",
    mainStream: "/profile2/media.smp",
    subStream: "/profile3/media.smp",
    aliases: ["hanwha", "wisenet", "xno-", "pnm-", "qno-"],
  },
  {
    manufacturer: "Bosch",
    mainStream: "/?inst=2",
    subStream: "/?inst=3",
    aliases: ["bosch", "dinion", "nbc-"],
  },
  {
    manufacturer: "Sony",
    mainStream: "/media/video1",
    subStream: "/media/video2",
    aliases: ["sony", "snc-"],
  },
  {
    manufacturer: "Panasonic",
    mainStream: "/MediaInput/stream_1",
    subStream: "/MediaInput/stream_2",
    aliases: ["panasonic", "wv-"],
  },
  {
    manufacturer: "TP-Link",
    mainStream: "/stream1",
    subStream: "/stream2",
    aliases: ["tp-link", "tapo", "vigi"],
  },
  {
    manufacturer: "Ubiquiti",
    mainStream: "/s0",
    subStream: "/s1",
    aliases: ["ubiquiti", "unifi", "uvc", "g4"],
  },
  {
    manufacturer: "GeoVision",
    mainStream: "/CH{channel}.sdp",
    subStream: "/CH{channel}_sub.sdp",
    aliases: ["geovision", "gv-"],
  },
  {
    manufacturer: "ACTi",
    mainStream: "/track1",
    subStream: "/track2",
    aliases: ["acti", "acd-", "acm-"],
  },
  {
    manufacturer: "Tiandy",
    mainStream: "/main",
    subStream: "/sub",
    aliases: ["tiandy"],
  },
  {
    manufacturer: "Speco",
    mainStream: "/cam/realmonitor?channel={channel}&subtype=0",
    subStream: "/cam/realmonitor?channel={channel}&subtype=1",
    aliases: ["speco"],
  },
  {
    manufacturer: "Ezviz",
    mainStream: "/h264_stream",
    subStream: "/h264_stream_sub",
    aliases: ["ezviz", "cs-"],
  },
  {
    manufacturer: "Jablotron",
    mainStream: "/stream=0",
    subStream: "/stream=1",
    aliases: ["jablotron", "jablotron"],
  },
  {
    manufacturer: "FLIR",
    mainStream: "/ch{channel}/main",
    subStream: "/ch{channel}/sub",
    aliases: ["flir", "dahua oem"],
  },
  {
    manufacturer: "Avigilon",
    mainStream: "/defaultPrimary?streamType=u",
    subStream: "/defaultSecondary?streamType=u",
    aliases: ["avigilon"],
  },
  {
    manufacturer: "Mobotix",
    mainStream: "/stream/profile0",
    subStream: "/stream/profile1",
    aliases: ["mobotix"],
  },
  {
    manufacturer: "Arecont",
    mainStream: "/h264.sdp",
    subStream: "/h264_2.sdp",
    aliases: ["arecont"],
  },
  {
    manufacturer: "Pelco",
    mainStream: "/stream1",
    subStream: "/stream2",
    aliases: ["pelco"],
  },
  {
    manufacturer: "Generic ONVIF",
    mainStream: "/onvif1",
    subStream: "/onvif2",
    aliases: ["onvif"],
  },
];

export type RtspDefinitionRow = {
  manufacturer: string;
  mainStream: string;
  subStream: string;
};

function pad2(n: number): string {
  return String(Math.max(1, Math.trunc(n))).padStart(2, "0");
}

/** Zamenja {channel}, {channel01}, {channelPadded}, … v poti. */
export function expandRtspPath(path: string, channel = 1): string {
  const ch = Math.max(1, Math.trunc(channel));
  const ch2 = pad2(ch);
  const ch01 = `${ch}01`;
  const ch02 = `${ch}02`;
  return path
    .replace(/\{channelPadded\}/gi, ch2)
    .replace(/\{channel01\}/gi, ch01)
    .replace(/\{channel02\}/gi, ch02)
    .replace(/\{channel\}/gi, String(ch))
    .replace(/\{ch\}/gi, String(ch));
}

export function buildRtspUrl(opts: {
  ip: string;
  path: string;
  user?: string;
  pass?: string;
  channel?: number;
  port?: number;
}): string {
  const ip = opts.ip.trim();
  if (!ip) return "";
  const path = expandRtspPath(opts.path, opts.channel ?? 1);
  const port = opts.port ?? 554;
  const p = path.startsWith("/") ? path : `/${path}`;
  const user = (opts.user ?? "").trim();
  const pass = (opts.pass ?? "").trim();
  const auth = user || pass ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : "";
  return `rtsp://${auth}${ip}:${port}${p}`;
}

export function matchManufacturer(
  model: string,
  definitions: RtspDefinitionRow[],
): RtspDefinitionRow | null {
  const m = model.trim().toLowerCase();
  if (!m) return null;

  for (const def of definitions) {
    if (m.includes(def.manufacturer.toLowerCase())) return def;
    const seed = RTSP_DEFINITION_SEEDS.find((s) => s.manufacturer === def.manufacturer);
    for (const alias of seed?.aliases ?? []) {
      if (m.includes(alias)) return def;
    }
  }
  return null;
}
