"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const SIGNAL_TYPES = ["all", "insight", "risk", "update", "anomaly", "decision"];
const SEVERITY_LEVELS = [1, 2, 3, 4, 5];

export function SignalFilters({ agents }: { agents: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentType = searchParams.get("type") ?? "all";
  const currentAgent = searchParams.get("agent") ?? "all";
  const currentSeverity = Number(searchParams.get("minSeverity") ?? "1");

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all" || value === "1") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.push(`/signals?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-guild-muted text-xs">Type:</span>
        {SIGNAL_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => updateParams("type", t)}
            className={`px-2 py-1 text-xs border border-guild-border ${
              (t === "all" ? currentType === "all" : currentType === t)
                ? "bg-guild-border text-guild-text"
                : "text-guild-muted hover:text-guild-text"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-guild-muted text-xs">Min Sev:</span>
        {SEVERITY_LEVELS.map((s) => (
          <button
            key={s}
            onClick={() => updateParams("minSeverity", String(s))}
            className={`px-2 py-1 text-xs border border-guild-border ${
              currentSeverity === s
                ? "bg-guild-border text-guild-text"
                : "text-guild-muted hover:text-guild-text"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {agents.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-guild-muted text-xs">Agent:</span>
          <select
            value={currentAgent}
            onChange={(e) => updateParams("agent", e.target.value)}
            className="bg-guild-surface border border-guild-border text-guild-text text-xs px-2 py-1"
          >
            <option value="all">All</option>
            {agents.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
