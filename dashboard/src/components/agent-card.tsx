import { ARCHETYPE_COLORS } from "@/lib/constants";
import { XpBar } from "./xp-bar";
import type { Agent, AgentStats, Archetype } from "@/lib/types";

interface AgentCardProps {
  agent: Agent;
  stats?: AgentStats;
}

export function AgentCard({ agent, stats }: AgentCardProps) {
  const colors = ARCHETYPE_COLORS[agent.archetype as Archetype] ?? ARCHETYPE_COLORS.sage;
  const successRate = stats && stats.totalRuns > 0
    ? Math.round((stats.totalSuccess / stats.totalRuns) * 100)
    : 0;

  return (
    <div className={`border-2 ${colors.border} ${colors.bg} p-4`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className={`font-pixel text-xs ${colors.text}`}>{agent.name}</div>
          <div className="text-guild-muted text-xs mt-1">{agent.id}</div>
        </div>
        <span className={`font-pixel text-[10px] ${colors.text} border ${colors.border} px-1.5 py-0.5`}>
          {agent.archetype}
        </span>
      </div>

      {stats && (
        <>
          <XpBar xp={stats.xp} level={stats.level} />
          <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
            <div>
              <div className="text-guild-muted">Runs</div>
              <div className="text-guild-text">{stats.totalRuns}</div>
            </div>
            <div>
              <div className="text-guild-muted">Success</div>
              <div className="text-guild-text">{successRate}%</div>
            </div>
            <div>
              <div className="text-guild-muted">Cost</div>
              <div className="text-guild-text">${stats.totalCost.toFixed(2)}</div>
            </div>
          </div>
        </>
      )}

      {!stats && (
        <div className="text-guild-muted text-xs mt-2">
          {agent.trigger} / {agent.model} / {agent.tier}
        </div>
      )}
    </div>
  );
}
