"use client";

import { memo } from "react";
import type { SchemaIconKey } from "@/lib/schema-icons";

type Props = {
  iconKey: SchemaIconKey;
  color: string;
  size?: number;
  status?: "online" | "offline" | "unknown";
  rotationDeg?: number;
  className?: string;
};

function Glyph({ iconKey }: { iconKey: SchemaIconKey }) {
  const s = 14;
  const stroke = "currentColor";
  const sw = 1.6;
  switch (iconKey) {
    case "camera-bullet":
      return (
        <g>
          <rect x={4} y={7} width={12} height={8} rx={1.5} fill="none" stroke={stroke} strokeWidth={sw} />
          <path d="M16 9 L19 7.5 V14.5 L16 13" fill="none" stroke={stroke} strokeWidth={sw} />
        </g>
      );
    case "camera-dome":
      return <ellipse cx={12} cy={11} rx={7} ry={5} fill="none" stroke={stroke} strokeWidth={sw} />;
    case "camera-ptz":
      return (
        <g>
          <rect x={5} y={12} width={14} height={4} rx={1} fill="none" stroke={stroke} strokeWidth={sw} />
          <circle cx={12} cy={9} r={4} fill="none" stroke={stroke} strokeWidth={sw} />
        </g>
      );
    case "camera-fisheye":
      return <circle cx={12} cy={11} r={6} fill="none" stroke={stroke} strokeWidth={sw} />;
    case "nvr":
      return (
        <g>
          <rect x={4} y={6} width={16} height={12} rx={1.5} fill="none" stroke={stroke} strokeWidth={sw} />
          <circle cx={8} cy={16} r={1} fill={stroke} />
          <circle cx={12} cy={16} r={1} fill={stroke} />
        </g>
      );
    case "switch":
      return (
        <g>
          <rect x={3} y={8} width={18} height={8} rx={1.5} fill="none" stroke={stroke} strokeWidth={sw} />
          {[6, 10, 14, 18].map((x) => (
            <circle key={x} cx={x} cy={12} r={1.2} fill={stroke} />
          ))}
        </g>
      );
    case "router":
      return (
        <g>
          <rect x={5} y={10} width={14} height={6} rx={1.5} fill="none" stroke={stroke} strokeWidth={sw} />
          <path d="M8 10 V7 M12 10 V6 M16 10 V7" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </g>
      );
    case "disk":
      return (
        <g>
          <ellipse cx={12} cy={14} rx={7} ry={3} fill="none" stroke={stroke} strokeWidth={sw} />
          <path d="M5 14 V9 C5 6.5 17 6.5 19 9 V14" fill="none" stroke={stroke} strokeWidth={sw} />
        </g>
      );
    case "raspberry":
      return (
        <g>
          <rect x={6} y={6} width={12} height={14} rx={2} fill="none" stroke={stroke} strokeWidth={sw} />
          <circle cx={10} cy={10} r={1} fill={stroke} />
          <circle cx={14} cy={10} r={1} fill={stroke} />
          <path d="M9 14 H15" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </g>
      );
    case "pc":
      return (
        <g>
          <rect x={4} y={5} width={16} height={11} rx={1} fill="none" stroke={stroke} strokeWidth={sw} />
          <path d="M8 19 H16 M12 16 V19" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </g>
      );
    case "laptop":
      return (
        <g>
          <rect x={5} y={6} width={14} height={9} rx={1} fill="none" stroke={stroke} strokeWidth={sw} />
          <path d="M3 17 H21" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </g>
      );
    case "server":
      return (
        <g>
          {[0, 5, 10].map((dy) => (
            <rect key={dy} x={5} y={5 + dy} width={14} height={4} rx={0.8} fill="none" stroke={stroke} strokeWidth={1.2} />
          ))}
        </g>
      );
    case "ap":
      return (
        <g>
          <path d="M12 17 V14" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M7 12 Q12 6 17 12" fill="none" stroke={stroke} strokeWidth={sw} />
          <path d="M9 14 Q12 10 15 14" fill="none" stroke={stroke} strokeWidth={sw} />
        </g>
      );
    case "poe":
      return (
        <g>
          <rect x={7} y={7} width={10} height={12} rx={1.5} fill="none" stroke={stroke} strokeWidth={sw} />
          <text x={12} y={15} textAnchor="middle" fontSize={7} fill={stroke} fontWeight="bold">
            P
          </text>
        </g>
      );
    case "intercom":
      return (
        <g>
          <rect x={7} y={5} width={10} height={14} rx={2} fill="none" stroke={stroke} strokeWidth={sw} />
          <circle cx={12} cy={11} r={2.5} fill="none" stroke={stroke} strokeWidth={1.2} />
        </g>
      );
    case "siren":
      return (
        <g>
          <path d="M8 16 H16 L14 8 H10 Z" fill="none" stroke={stroke} strokeWidth={sw} />
          <path d="M6 16 H18" stroke={stroke} strokeWidth={sw} />
        </g>
      );
    case "keypad":
      return (
        <g>
          <rect x={6} y={6} width={12} height={14} rx={1.5} fill="none" stroke={stroke} strokeWidth={sw} />
          {[0, 1, 2].map((row) =>
            [0, 1, 2].map((col) => (
              <rect
                key={`${row}-${col}`}
                x={8 + col * 3}
                y={8 + row * 3}
                width={2}
                height={2}
                rx={0.3}
                fill={stroke}
              />
            )),
          )}
        </g>
      );
    case "ups":
      return (
        <g>
          <rect x={6} y={5} width={12} height={16} rx={1.5} fill="none" stroke={stroke} strokeWidth={sw} />
          <path d="M12 8 L10 12 H14 L12 16" fill="none" stroke={stroke} strokeWidth={1.4} />
        </g>
      );
    case "monitor":
      return (
        <g>
          <rect x={4} y={5} width={16} height={10} rx={1} fill="none" stroke={stroke} strokeWidth={sw} />
          <path d="M8 18 H16 M12 15 V18" stroke={stroke} strokeWidth={sw} />
        </g>
      );
    default:
      return <circle cx={12} cy={11} r={5} fill="none" stroke={stroke} strokeWidth={sw} />;
  }
}

export const SchemaIcon = memo(function SchemaIcon({
  iconKey,
  color,
  size = 40,
  status = "unknown",
  rotationDeg = 0,
  className = "",
}: Props) {
  const ring =
    status === "online"
      ? "var(--vo-ok)"
      : status === "offline"
        ? "var(--vo-danger)"
        : "transparent";
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size, transform: `rotate(${rotationDeg}deg)` }}
    >
      <div
        className="flex items-center justify-center rounded-full shadow-md"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          boxShadow: `0 0 0 2px ${ring}, 0 2px 8px rgba(0,0,0,0.35)`,
        }}
      >
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" className="text-white">
          <Glyph iconKey={iconKey} />
        </svg>
      </div>
    </div>
  );
});
