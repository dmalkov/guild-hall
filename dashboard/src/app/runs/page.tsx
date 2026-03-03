import { getRuns } from "@/lib/api";
import { RunTable } from "@/components/run-table";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const runs = await getRuns(100);

  return (
    <div className="space-y-6">
      <h2 className="font-pixel text-guild-gold text-sm">Quest Runs</h2>
      <RunTable runs={runs} />
    </div>
  );
}
