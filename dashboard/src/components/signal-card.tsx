import { SIGNAL_TYPE_CONFIG, SEVERITY_COLORS } from "@/lib/constants";
import type { NormalizedResult, SignalType } from "@/lib/types";

interface SignalCardProps {
  signal: NormalizedResult;
}

interface EvidenceItem {
  title: string;
  url?: string;
  snippet?: string;
}

export function SignalCard({ signal }: SignalCardProps) {
  const typeConfig = SIGNAL_TYPE_CONFIG[signal.type as SignalType] ?? SIGNAL_TYPE_CONFIG.update;
  const sevColor = SEVERITY_COLORS[signal.severity] ?? "text-gray-400";

  let evidence: EvidenceItem[] = [];
  try {
    evidence = JSON.parse(signal.evidence);
  } catch { /* ignore */ }

  return (
    <div className="border-2 border-guild-border bg-guild-surface p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`font-pixel text-xs ${typeConfig.color}`}>
            [{typeConfig.icon}]
          </span>
          <span className="font-pixel text-[10px] text-guild-muted uppercase">
            {signal.type}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-pixel text-xs ${sevColor}`}>
            S{signal.severity}
          </span>
          <span className="text-guild-muted text-xs">
            {Math.round(signal.confidence * 100)}%
          </span>
        </div>
      </div>

      <p className="text-guild-text mb-2">{signal.summary}</p>

      <div className="flex items-center justify-between text-xs text-guild-muted">
        <span>{signal.agentName}</span>
        <span>{signal.timeSensitivity.replace("_", " ")}</span>
      </div>

      {evidence.length > 0 && (
        <div className="mt-2 border-t border-guild-border pt-2 space-y-1">
          {evidence.map((e, i) => (
            <div key={i} className="text-xs text-guild-muted">
              {e.url ? (
                <a href={e.url} target="_blank" rel="noopener" className="hover:text-guild-text underline">
                  {e.title}
                </a>
              ) : (
                <span>{e.title}</span>
              )}
              {e.snippet && <span className="block text-guild-muted/60 ml-2">{e.snippet}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
