import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { AgentRegistry } from "../schema/registry.js";
import { dispatch } from "./dispatcher.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function startServer(registry: AgentRegistry, port = 3001): void {
  const app = new Hono();

  // Health check
  app.get("/", (c) => c.json({ name: "The Guild Hall", status: "online" }));

  // List agents
  app.get("/agents", (c) => {
    const agents = [...registry.getAll()].map(([id, cfg]) => ({
      id,
      name: cfg.name,
      archetype: cfg.archetype,
      trigger: cfg.trigger.type,
      tier: cfg.autonomy_tier,
      model: cfg.model,
    }));
    return c.json(agents);
  });

  // Dispatch an agent
  app.post("/dispatch/:agentId", async (c) => {
    const agentId = c.req.param("agentId");
    const config = registry.get(agentId);

    if (!config) {
      return c.json({ error: `Agent not found: ${agentId}` }, 404);
    }

    let input: string | undefined;
    try {
      const body = await c.req.json();
      input = body.input;
    } catch {
      // No body is fine
    }

    const result = await dispatch({
      agentId,
      config,
      input,
      triggerType: "http",
    });

    return c.json(result);
  });

  // Get recent runs
  app.get("/runs", async (c) => {
    const limit = Number(c.req.query("limit") ?? "20");
    const runs = await prisma.questRun.findMany({
      orderBy: { startedAt: "desc" },
      take: limit,
    });
    return c.json(runs);
  });

  // Get agent stats
  app.get("/stats", async (c) => {
    const stats = await prisma.agentStats.findMany();
    return c.json(stats);
  });

  serve({ fetch: app.fetch, port }, () => {
    console.log(`[server] Guild Hall API on http://localhost:${port}`);
  });
}
