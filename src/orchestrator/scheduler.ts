import cron, { type ScheduledTask } from "node-cron";
import { PrismaClient } from "@prisma/client";
import { AgentRegistry } from "../schema/registry.js";
import { dispatch } from "./dispatcher.js";

const prisma = new PrismaClient();
const activeJobs: Map<string, ScheduledTask> = new Map();

function today(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Start cron jobs for all agents with cron-type triggers.
 */
export function startScheduler(registry: AgentRegistry): void {
  const cronAgents = registry.getByCron();

  for (const [agentId, config] of cronAgents) {
    if (config.trigger.type !== "cron") continue;

    const schedule = config.trigger.schedule;
    if (!cron.validate(schedule)) {
      console.error(`[scheduler] Invalid cron for ${agentId}: ${schedule}`);
      continue;
    }

    const job = cron.schedule(schedule, async () => {
      console.log(`[scheduler] Cron triggered: ${config.name} (${agentId})`);
      try {
        const result = await dispatch({
          agentId,
          config,
          triggerType: "cron",
        });

        if (result.status === "success") {
          await recordCompletion(agentId, result.runId);
          await triggerDependents(registry, agentId);
        }
      } catch (err) {
        console.error(`[scheduler] ${agentId} dispatch error:`, err);
      }
    }, {
      timezone: "America/New_York",
    });

    activeJobs.set(agentId, job);
    console.log(
      `[scheduler] Registered: ${config.name} — ${schedule}`
    );
  }

  console.log(`[scheduler] ${activeJobs.size} cron jobs active.`);
}

/**
 * Record that an agent completed successfully today.
 */
async function recordCompletion(agentName: string, questRunId: number): Promise<void> {
  const date = today();
  await prisma.dependencyCompletion.upsert({
    where: {
      agentName_completedDate: { agentName, completedDate: date },
    },
    create: { agentName, completedDate: date, questRunId },
    update: { questRunId, completedAt: new Date() },
  });
  console.log(`[scheduler] Recorded completion: ${agentName} for ${date}`);
}

/**
 * After an agent completes, check if any 'after' agents should fire.
 * Only fires when ALL dependencies are satisfied for today AND the
 * dependent hasn't already run successfully today.
 */
async function triggerDependents(
  registry: AgentRegistry,
  completedAgentId: string
): Promise<void> {
  const dependents = registry.getDependents(completedAgentId);

  for (const [depId, depConfig] of dependents) {
    if (depConfig.trigger.type !== "after") continue;

    const requiredDeps = depConfig.trigger.depends_on;
    const date = today();

    // Check all deps completed today
    const completions = await prisma.dependencyCompletion.findMany({
      where: {
        agentName: { in: requiredDeps },
        completedDate: date,
      },
    });

    const completedNames = new Set(completions.map((c) => c.agentName));
    const allSatisfied = requiredDeps.every((dep) => completedNames.has(dep));

    if (!allSatisfied) {
      const missing = requiredDeps.filter((d) => !completedNames.has(d));
      console.log(
        `[scheduler] ${depConfig.name} — waiting for: ${missing.join(", ")}`
      );
      continue;
    }

    // Prevent double-fire: check if dependent already ran successfully today
    const existingRun = await prisma.questRun.findFirst({
      where: {
        agentName: depId,
        status: "success",
        startedAt: { gte: new Date(`${date}T00:00:00`) },
      },
    });

    if (existingRun) {
      console.log(
        `[scheduler] ${depConfig.name} — already ran today (run #${existingRun.id}), skipping`
      );
      continue;
    }

    // Load today's NormalizedResults as input for the dependent (e.g. Scribe)
    const normalizedResults = await prisma.normalizedResult.findMany({
      where: {
        questRun: {
          agentName: { in: requiredDeps },
          status: "success",
          startedAt: { gte: new Date(`${date}T00:00:00`) },
        },
      },
      orderBy: [{ severity: "desc" }, { confidence: "desc" }],
    });

    const input = normalizedResults.length > 0
      ? JSON.stringify(
          normalizedResults.map((r) => ({
            agent: r.agentName,
            type: r.type,
            severity: r.severity,
            confidence: r.confidence,
            summary: r.summary,
            evidence: r.evidence,
            owner: r.owner,
            time_sensitivity: r.timeSensitivity,
          })),
          null,
          2
        )
      : undefined;

    console.log(
      `[scheduler] All deps satisfied for ${depConfig.name} — dispatching with ${normalizedResults.length} signals`
    );

    try {
      const result = await dispatch({
        agentId: depId,
        config: depConfig,
        input,
        triggerType: "after",
        triggerData: `triggered by ${completedAgentId} (all deps: ${requiredDeps.join(", ")})`,
      });

      if (result.status === "success") {
        await recordCompletion(depId, result.runId);
      }
    } catch (err) {
      console.error(`[scheduler] Dependent ${depId} failed:`, err);
    }
  }
}

/**
 * Exported for manual dispatch in main.ts — record completion + trigger dependents.
 */
export async function postDispatchHook(
  registry: AgentRegistry,
  agentId: string,
  runId: number
): Promise<void> {
  await recordCompletion(agentId, runId);
  await triggerDependents(registry, agentId);
}

export function stopScheduler(): void {
  for (const [id, job] of activeJobs) {
    job.stop();
    console.log(`[scheduler] Stopped: ${id}`);
  }
  activeJobs.clear();
}
