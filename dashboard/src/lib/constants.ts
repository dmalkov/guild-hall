import type { Archetype, SignalType } from "./types";

export const ARCHETYPE_COLORS: Record<Archetype, { bg: string; border: string; text: string }> = {
  sage:       { bg: "bg-cyan-950",    border: "border-cyan-400",    text: "text-cyan-400" },
  mage:       { bg: "bg-purple-950",  border: "border-purple-400",  text: "text-purple-400" },
  rogue:      { bg: "bg-green-950",   border: "border-green-400",   text: "text-green-400" },
  knight:     { bg: "bg-red-950",     border: "border-red-400",     text: "text-red-400" },
  bard:       { bg: "bg-amber-950",   border: "border-amber-400",   text: "text-amber-400" },
  blacksmith: { bg: "bg-orange-950",  border: "border-orange-400",  text: "text-orange-400" },
  ranger:     { bg: "bg-teal-950",    border: "border-teal-400",    text: "text-teal-400" },
};

export const STATUS_COLORS: Record<string, string> = {
  running: "text-yellow-400 border-yellow-400",
  success: "text-green-400 border-green-400",
  failed:  "text-red-400 border-red-400",
  timeout: "text-orange-400 border-orange-400",
};

export const SIGNAL_TYPE_CONFIG: Record<SignalType, { icon: string; color: string }> = {
  insight:  { icon: "!", color: "text-cyan-400" },
  risk:     { icon: "!", color: "text-red-400" },
  update:   { icon: ">", color: "text-green-400" },
  anomaly:  { icon: "?", color: "text-yellow-400" },
  decision: { icon: "#", color: "text-purple-400" },
};

export const SEVERITY_COLORS: Record<number, string> = {
  1: "text-gray-400",
  2: "text-blue-400",
  3: "text-yellow-400",
  4: "text-orange-400",
  5: "text-red-400",
};

export const XP_PER_LEVEL = 100;

export function xpForLevel(level: number): number {
  return level * XP_PER_LEVEL;
}
