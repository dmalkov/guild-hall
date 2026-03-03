import "../env.js";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { execFile } from "child_process";
import { PrismaClient } from "@prisma/client";
import { type AgentConfig, MODEL_IDS, MODEL_RATES } from "../schema/agent-config.js";
import { parseClaudeOutput } from "./cost-tracker.js";
import { normalize } from "../intelligence/normalizer.js";
import { qualityGate, type NormalizedSignal } from "../intelligence/quality-gate.js";

const prisma = new PrismaClient();
const anthropic = new Anthropic();

export interface DispatchOptions {
  agentId: string;
  config: AgentConfig;
  input?: string;
  triggerType?: string;
  triggerData?: string;
}

export interface DispatchResult {
  runId: number;
  status: "success" | "failed" | "timeout";
  normalizedResults?: NormalizedSignal[];
  rawOutput?: string;
  error?: string;
  costUsd: number;
  normalizerCostUsd?: number;
}

/**
 * Dispatch an agent — routes to SDK or CLI based on config.dispatch_mode.
 */
export async function dispatch(opts: DispatchOptions): Promise<DispatchResult> {
  const { config } = opts;
  if (config.dispatch_mode === "cli") {
    return dispatchCli(opts);
  }
  return dispatchSdk(opts);
}

/**
 * Dispatch via Anthropic SDK (direct API call).
 * Used for agents that don't need tools (Night Thoughts, Scribe).
 */
async function dispatchSdk(opts: DispatchOptions): Promise<DispatchResult> {
  const { agentId, config, input, triggerType, triggerData } = opts;

  const run = await prisma.questRun.create({
    data: {
      agentName: agentId,
      archetype: config.archetype,
      status: "running",
      triggerType: triggerType ?? config.trigger.type,
      triggerData,
      modelUsed: config.model,
    },
  });

  console.log(
    `[dispatch:sdk] ${config.name} (${agentId}) — run #${run.id} — model: ${config.model}`
  );

  try {
    const promptPath = resolve(process.cwd(), config.prompt_file);
    const systemPrompt = readFileSync(promptPath, "utf-8");
    const userMessage =
      input ??
      `Execute your scheduled task. Today is ${new Date().toISOString().split("T")[0]}.`;

    const modelId = MODEL_IDS[config.model] ?? MODEL_IDS.sonnet;

    // Timeout via AbortController
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeout_ms);

    let response: Anthropic.Message;
    try {
      response = await anthropic.messages.create(
        {
          model: modelId,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        },
        { signal: controller.signal }
      );
    } finally {
      clearTimeout(timeout);
    }

    const content = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const rates = MODEL_RATES[config.model] ?? MODEL_RATES.sonnet;
    const costUsd =
      (inputTokens / 1_000_000) * rates.input +
      (outputTokens / 1_000_000) * rates.output;

    // Save output to Obsidian
    const outputPath = saveOutput(config, content, agentId);

    // Update run with raw output
    await prisma.questRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        completedAt: new Date(),
        inputTokens,
        outputTokens,
        costUsd,
        rawOutput: content,
        outputPath,
        xpEarned: 10,
      },
    });

    await updateAgentStats(agentId, costUsd, true);

    // Budget warning
    if (costUsd > config.max_cost_per_run) {
      console.warn(
        `[dispatch:sdk] ${config.name} — BUDGET WARNING: $${costUsd.toFixed(4)} > max $${config.max_cost_per_run}`
      );
    }

    console.log(
      `[dispatch:sdk] ${config.name} — SUCCESS — $${costUsd.toFixed(4)} (${inputTokens}in/${outputTokens}out)`
    );

    // Run normalizer
    const normResult = await normalize(run.id, agentId, config, content);

    // Run quality gate for non-auto agents
    let finalResults = normResult.results;
    if (config.autonomy_tier !== "auto") {
      const gate = await qualityGate(normResult.results, config);
      finalResults = gate.filtered;
    }

    return {
      runId: run.id,
      status: "success",
      normalizedResults: finalResults,
      rawOutput: content,
      costUsd,
      normalizerCostUsd: normResult.costUsd,
    };
  } catch (err) {
    const isAbort =
      err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"));
    const status = isAbort ? "timeout" : "failed";
    const errorMessage = err instanceof Error ? err.message : String(err);

    await prisma.questRun.update({
      where: { id: run.id },
      data: {
        status,
        completedAt: new Date(),
        errorMessage,
      },
    });

    await updateAgentStats(agentId, 0, false);
    console.error(`[dispatch:sdk] ${config.name} — ${status.toUpperCase()} — ${errorMessage}`);

    return {
      runId: run.id,
      status,
      error: errorMessage,
      costUsd: 0,
    };
  }
}

/**
 * Dispatch via Claude CLI (`claude -p`).
 * Used for agents that need tools (web search, Slack MCP, etc.).
 */
async function dispatchCli(opts: DispatchOptions): Promise<DispatchResult> {
  const { agentId, config, input, triggerType, triggerData } = opts;

  const run = await prisma.questRun.create({
    data: {
      agentName: agentId,
      archetype: config.archetype,
      status: "running",
      triggerType: triggerType ?? config.trigger.type,
      triggerData,
      modelUsed: config.model,
    },
  });

  console.log(
    `[dispatch:cli] ${config.name} (${agentId}) — run #${run.id} — model: ${config.model}`
  );

  try {
    const promptPath = resolve(process.cwd(), config.prompt_file);
    const systemPrompt = readFileSync(promptPath, "utf-8");
    const userMessage =
      input ??
      `Execute your scheduled task. Today is ${new Date().toISOString().split("T")[0]}.`;

    const modelId = MODEL_IDS[config.model] ?? MODEL_IDS.sonnet;

    const args = [
      "-p", userMessage,
      "--model", modelId,
      "--output-format", "json",
      "--max-turns", "20",
      "--dangerously-skip-permissions",
      "--system-prompt", systemPrompt,
    ];

    // Strip env vars that cause nested Claude Code conflicts
    const env = { ...process.env };
    delete env.CLAUDE_CODE_SSE_PORT;
    delete env.CLAUDECODE;

    const cliOutput = await new Promise<string>((resolve, reject) => {
      execFile("claude", args, {
        timeout: config.timeout_ms,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        env,
      }, (err, stdout, stderr) => {
        if (err) {
          // execFile timeout sets err.killed = true
          if (err.killed) {
            reject(new Error(`CLI timeout after ${config.timeout_ms}ms`));
          } else {
            reject(new Error(`CLI error: ${err.message}\nstderr: ${stderr}`));
          }
          return;
        }
        resolve(stdout);
      });
    });

    const { content, usage } = parseClaudeOutput(cliOutput);

    const inputTokens = usage?.inputTokens ?? 0;
    const outputTokens = usage?.outputTokens ?? 0;
    const costUsd = usage?.costUsd ?? 0;

    // Save output to Obsidian
    const outputPath = saveOutput(config, content, agentId);

    // Update run
    await prisma.questRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        completedAt: new Date(),
        inputTokens,
        outputTokens,
        costUsd,
        rawOutput: content,
        outputPath,
        xpEarned: 10,
      },
    });

    await updateAgentStats(agentId, costUsd, true);

    if (costUsd > config.max_cost_per_run) {
      console.warn(
        `[dispatch:cli] ${config.name} — BUDGET WARNING: $${costUsd.toFixed(4)} > max $${config.max_cost_per_run}`
      );
    }

    console.log(
      `[dispatch:cli] ${config.name} — SUCCESS — $${costUsd.toFixed(4)} (${inputTokens}in/${outputTokens}out)`
    );

    // Run normalizer
    const normResult = await normalize(run.id, agentId, config, content);

    // Run quality gate for non-auto agents
    let finalResults = normResult.results;
    if (config.autonomy_tier !== "auto") {
      const gate = await qualityGate(normResult.results, config);
      finalResults = gate.filtered;
    }

    return {
      runId: run.id,
      status: "success",
      normalizedResults: finalResults,
      rawOutput: content,
      costUsd,
      normalizerCostUsd: normResult.costUsd,
    };
  } catch (err) {
    const isTimeout = err instanceof Error && err.message.includes("timeout");
    const status = isTimeout ? "timeout" : "failed";
    const errorMessage = err instanceof Error ? err.message : String(err);

    await prisma.questRun.update({
      where: { id: run.id },
      data: {
        status,
        completedAt: new Date(),
        errorMessage,
      },
    });

    await updateAgentStats(agentId, 0, false);
    console.error(`[dispatch:cli] ${config.name} — ${status.toUpperCase()} — ${errorMessage}`);

    return {
      runId: run.id,
      status,
      error: errorMessage,
      costUsd: 0,
    };
  }
}

function saveOutput(
  config: AgentConfig,
  content: string,
  agentId: string
): string {
  const outputDir = config.output_path.replace("~", process.env.HOME ?? "~");
  const date = new Date().toISOString().split("T")[0];
  const filename = `${date}-${agentId}.md`;
  const fullPath = resolve(outputDir, filename);

  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf-8");

  return fullPath;
}

async function updateAgentStats(
  agentName: string,
  costUsd: number,
  success: boolean
): Promise<void> {
  await prisma.agentStats.upsert({
    where: { agentName },
    create: {
      agentName,
      totalRuns: 1,
      totalSuccess: success ? 1 : 0,
      totalCost: costUsd,
      xp: success ? 10 : 0,
      level: 1,
      precisionPct: 0,
    },
    update: {
      totalRuns: { increment: 1 },
      totalSuccess: success ? { increment: 1 } : undefined,
      totalCost: { increment: costUsd },
      xp: success ? { increment: 10 } : undefined,
    },
  });
}
