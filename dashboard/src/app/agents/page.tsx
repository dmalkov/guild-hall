import { getAgents, getStats } from "@/lib/api";
import { AgentCard } from "@/components/agent-card";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const [agents, stats] = await Promise.all([getAgents(), getStats()]);
  const statsMap = new Map(stats.map((s) => [s.agentName, s]));

  return (
    <div className="space-y-6">
      <h2 className="font-pixel text-guild-gold text-sm">Agent Roster</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} stats={statsMap.get(agent.id)} />
        ))}
      </div>
      {agents.length === 0 && (
        <div className="border-2 border-guild-border bg-guild-surface p-6 text-center text-guild-muted">
          No agents registered. Check agents.yaml.
        </div>
      )}
    </div>
  );
}
