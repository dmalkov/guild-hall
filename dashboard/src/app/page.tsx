import { getAgents, getRuns, getStats } from "@/lib/api";
import { StatCard } from "@/components/stat-card";
import { AgentCard } from "@/components/agent-card";
import { RunTable } from "@/components/run-table";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  let agents, runs, stats;
  try {
    [agents, runs, stats] = await Promise.all([
      getAgents(),
      getRuns(10),
      getStats(),
    ]);
  } catch {
    return <OfflineState />;
  }

  const statsMap = new Map(stats.map((s) => [s.agentName, s]));
  const totalRuns = stats.reduce((acc, s) => acc + s.totalRuns, 0);
  const totalCost = stats.reduce((acc, s) => acc + s.totalCost, 0);
  const totalXp = stats.reduce((acc, s) => acc + s.xp, 0);
  const avgSuccess =
    stats.length > 0
      ? Math.round(
          stats.reduce((acc, s) => acc + (s.totalRuns > 0 ? s.totalSuccess / s.totalRuns : 0), 0) /
            stats.length * 100
        )
      : 0;

  return (
    <div className="space-y-6">
      <h2 className="font-pixel text-guild-gold text-sm">Overview</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Runs" value={totalRuns} />
        <StatCard label="Total Cost" value={`$${totalCost.toFixed(2)}`} />
        <StatCard label="Guild XP" value={totalXp} />
        <StatCard label="Avg Success" value={`${avgSuccess}%`} />
      </div>

      <div>
        <h3 className="font-pixel text-xs text-guild-muted mb-3">Agent Roster</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} stats={statsMap.get(agent.id)} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-pixel text-xs text-guild-muted mb-3">Recent Quests</h3>
        <RunTable runs={runs} />
      </div>
    </div>
  );
}

function OfflineState() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="border-2 border-guild-border bg-guild-surface p-8 text-center max-w-md">
        <div className="font-pixel text-guild-gold text-sm mb-4">
          Guild Hall Offline
        </div>
        <p className="text-guild-muted text-sm mb-2">
          Cannot reach the orchestrator API.
        </p>
        <p className="text-guild-muted text-xs">
          Start the server: <code className="text-guild-text">npx tsx src/main.ts serve</code>
        </p>
      </div>
    </div>
  );
}
