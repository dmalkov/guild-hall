import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { AgentRegistry } from "../schema/registry.js";
import { dispatch } from "./dispatcher.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function startServer(registry: AgentRegistry, port = 3001): void {
  const app = new Hono();

  app.use("*", cors());

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

  // Get single run with nested data
  app.get("/runs/:runId", async (c) => {
    const runId = Number(c.req.param("runId"));
    const run = await prisma.questRun.findUnique({
      where: { id: runId },
      include: {
        normalizedResults: { orderBy: { severity: "desc" } },
        feedback: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!run) {
      return c.json({ error: `Run not found: ${runId}` }, 404);
    }
    return c.json(run);
  });

  // Cross-agent signal feed
  app.get("/signals", async (c) => {
    const limit = Number(c.req.query("limit") ?? "50");
    const type = c.req.query("type");
    const agent = c.req.query("agent");
    const minSeverity = Number(c.req.query("minSeverity") ?? "1");

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (agent) where.agentName = agent;
    if (minSeverity > 1) where.severity = { gte: minSeverity };

    const signals = await prisma.normalizedResult.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { questRun: { select: { id: true, status: true, startedAt: true } } },
    });
    return c.json(signals);
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
