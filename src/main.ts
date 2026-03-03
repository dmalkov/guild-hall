import "./env.js";
import { resolve } from "path";
import { AgentRegistry } from "./schema/registry.js";
import { dispatch } from "./orchestrator/dispatcher.js";
import { startScheduler, stopScheduler, postDispatchHook } from "./orchestrator/scheduler.js";
import { startServer } from "./orchestrator/server.js";

const AGENTS_YAML = resolve(import.meta.dirname, "..", "agents.yaml");

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const registry = new AgentRegistry(AGENTS_YAML);

  switch (command) {
    case "serve": {
      const port = Number(args[1] ?? "3001");
      console.log("\nThe Guild Hall — Starting...\n");
      startScheduler(registry);
      startServer(registry, port);

      // Graceful shutdown
      const shutdown = () => {
        console.log("\n[guild-hall] Shutting down...");
        stopScheduler();
        process.exit(0);
      };
      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
      break;
    }

    case "dispatch": {
      const agentId = args[1];
      const input = args[2];

      if (!agentId) {
        console.error("Usage: guild-hall dispatch <agent-id> [input]");
        process.exit(1);
      }

      const config = registry.get(agentId);
      if (!config) {
        console.error(`Agent not found: ${agentId}`);
        console.error(
          `Available: ${[...registry.getAll().keys()].join(", ")}`
        );
        process.exit(1);
      }

      const result = await dispatch({
        agentId,
        config,
        input,
        triggerType: "manual",
      });

      // Record completion and trigger dependents
      if (result.status === "success") {
        await postDispatchHook(registry, agentId, result.runId);
      }

      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case "list": {
      const agents = registry.getAll();
      console.log("\nThe Guild Hall — Agent Roster\n");
      for (const [id, cfg] of agents) {
        console.log(
          `  ${cfg.name.padEnd(20)} [${cfg.archetype}] trigger=${cfg.trigger.type} tier=${cfg.autonomy_tier} model=${cfg.model}`
        );
      }
      console.log(`\n  ${agents.size} agents registered.\n`);
      break;
    }

    case "stats": {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      const stats = await prisma.agentStats.findMany();
      console.log("\nAgent Stats:\n");
      for (const s of stats) {
        console.log(
          `  ${s.agentName.padEnd(20)} Lv${s.level} | ${s.totalRuns} runs | ${s.totalSuccess} ok | $${s.totalCost.toFixed(2)} spent | ${s.xp} XP`
        );
      }
      if (stats.length === 0) console.log("  No runs yet.");
      console.log();
      await prisma.$disconnect();
      break;
    }

    default:
      console.log(`
The Guild Hall — Agent Runner

Commands:
  serve [port]                  Start scheduler + HTTP API (default port 3001)
  dispatch <agent-id> [input]   Run an agent with optional input
  list                          Show registered agents
  stats                         Show agent run statistics
`);
  }
}

main().catch(console.error);
