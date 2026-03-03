import { Suspense } from "react";
import { getAgents, getSignals } from "@/lib/api";
import { SignalCard } from "@/components/signal-card";
import { SignalFilters } from "@/components/signal-filters";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ type?: string; agent?: string; minSeverity?: string }>;
}

export default async function SignalsPage({ searchParams }: Props) {
  const params = await searchParams;
  const [signals, agents] = await Promise.all([
    getSignals({
      limit: 50,
      type: params.type,
      agent: params.agent,
      minSeverity: params.minSeverity ? Number(params.minSeverity) : undefined,
    }),
    getAgents(),
  ]);

  const agentNames = agents.map((a) => a.id);

  return (
    <div className="space-y-6">
      <h2 className="font-pixel text-guild-gold text-sm">Signal Feed</h2>

      <Suspense>
        <SignalFilters agents={agentNames} />
      </Suspense>

      <div className="space-y-3">
        {signals.map((signal) => (
          <SignalCard key={signal.id} signal={signal} />
        ))}
        {signals.length === 0 && (
          <div className="border-2 border-guild-border bg-guild-surface p-6 text-center text-guild-muted">
            No signals match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
