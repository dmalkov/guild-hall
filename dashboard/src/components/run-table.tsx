import { StatusBadge } from "./status-badge";
import type { QuestRun } from "@/lib/types";

interface RunTableProps {
  runs: QuestRun[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "...";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function formatTokens(n: number | null): string {
  if (n == null) return "-";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function RunTable({ runs }: RunTableProps) {
  return (
    <div className="border-2 border-guild-border overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b-2 border-guild-border bg-guild-surface text-guild-muted">
            <th className="text-left p-3">ID</th>
            <th className="text-left p-3">Agent</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Started</th>
            <th className="text-left p-3">Duration</th>
            <th className="text-right p-3">Tokens</th>
            <th className="text-right p-3">Cost</th>
            <th className="text-right p-3">XP</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-b border-guild-border/50 hover:bg-guild-surface/50">
              <td className="p-3 text-guild-muted">#{run.id}</td>
              <td className="p-3">{run.agentName}</td>
              <td className="p-3"><StatusBadge status={run.status} /></td>
              <td className="p-3 text-guild-muted">{formatDate(run.startedAt)}</td>
              <td className="p-3 text-guild-muted">{formatDuration(run.startedAt, run.completedAt)}</td>
              <td className="p-3 text-right text-guild-muted">
                {formatTokens(run.inputTokens)} / {formatTokens(run.outputTokens)}
              </td>
              <td className="p-3 text-right text-guild-gold">
                {run.costUsd != null ? `$${run.costUsd.toFixed(4)}` : "-"}
              </td>
              <td className="p-3 text-right">{run.xpEarned > 0 ? `+${run.xpEarned}` : "-"}</td>
            </tr>
          ))}
          {runs.length === 0 && (
            <tr>
              <td colSpan={8} className="p-6 text-center text-guild-muted">
                No quest runs yet. The guild awaits its first dispatch.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
