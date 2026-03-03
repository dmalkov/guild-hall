import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { type AgentConfig, MODEL_RATES } from "../schema/agent-config.js";

const prisma = new PrismaClient();
const anthropic = new Anthropic();

const HAIKU_MODEL = "claude-haiku-4-5-20251001";

const NormalizedSignalSchema = z.object({
  type: z.enum(["insight", "risk", "update", "anomaly", "decision"]),
  severity: z.number().min(1).max(5),
  confidence: z.number().min(0).max(1),
  summary: z.string().max(150),
  evidence: z.array(
    z.object({
      url: z.string().optional(),
      title: z.string(),
      snippet: z.string().optional(),
    })
  ),
  owner: z.string().optional(),
  time_sensitivity: z.enum(["today", "this_week", "this_month"]),
});

const NormalizedArraySchema = z.array(NormalizedSignalSchema);

export interface NormalizeResult {
  results: Array<{
    type: string;
    severity: number;
    confidence: number;
    summary: string;
    evidence: string; // JSON string
    owner?: string;
    timeSensitivity: string;
  }>;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
}

const NORMALIZER_SYSTEM_PROMPT = `You are a signal extraction engine. Your job is to extract ALL distinct, actionable signals from raw agent output.

For each signal, return:
- type: insight | risk | update | anomaly | decision
- severity: 1 (trivial) to 5 (critical)
- confidence: 0.0 to 1.0 — how confident the source seems
- summary: max 100 chars, factual, no opinions
- evidence: array of {title, url?, snippet?} — at least one item required
- owner: who should act on this (optional)
- time_sensitivity: today | this_week | this_month

Rules:
- Extract EVERY distinct signal. Don't merge different topics.
- Never invent signals not present in the input.
- Evidence is REQUIRED — if no evidence exists, use the summary as evidence title.
- Severity guide: 1=FYI, 2=worth noting, 3=should review, 4=action needed, 5=urgent
- Return a JSON array. No markdown, no explanation, just the JSON array.`;

export async function normalize(
  questRunId: number,
  agentId: string,
  config: AgentConfig,
  rawOutput: string
): Promise<NormalizeResult> {
  try {
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 2048,
      system: NORMALIZER_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Extract signals from this ${config.name} (${agentId}) output:\n\n${rawOutput}`,
        },
      ],
    });

    const content = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const rates = MODEL_RATES.haiku;
    const costUsd =
      (inputTokens / 1_000_000) * rates.input +
      (outputTokens / 1_000_000) * rates.output;

    // Parse and validate
    const jsonStr = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    const signals = NormalizedArraySchema.parse(parsed);

    // Save to DB
    const dbResults = await Promise.all(
      signals.map((signal) =>
        prisma.normalizedResult.create({
          data: {
            questRunId,
            agentName: agentId,
            archetype: config.archetype,
            type: signal.type,
            severity: signal.severity,
            confidence: signal.confidence,
            summary: signal.summary,
            evidence: JSON.stringify(signal.evidence),
            owner: signal.owner,
            timeSensitivity: signal.time_sensitivity,
            costUsd,
            inputTokens,
            outputTokens,
          },
        })
      )
    );

    // Update run with normalizer cost
    await prisma.questRun.update({
      where: { id: questRunId },
      data: { normalizerCostUsd: costUsd },
    });

    console.log(
      `[normalizer] ${config.name} — extracted ${signals.length} signals — $${costUsd.toFixed(4)}`
    );

    return {
      results: dbResults.map((r) => ({
        type: r.type,
        severity: r.severity,
        confidence: r.confidence,
        summary: r.summary,
        evidence: r.evidence,
        owner: r.owner ?? undefined,
        timeSensitivity: r.timeSensitivity,
      })),
      costUsd,
      inputTokens,
      outputTokens,
    };
  } catch (err) {
    console.error(
      `[normalizer] ${config.name} — LLM extraction failed, using deterministic fallback:`,
      err instanceof Error ? err.message : err
    );
    return deterministicFallback(questRunId, agentId, config, rawOutput);
  }
}

/**
 * Deterministic fallback: if Haiku fails, create a single "update" signal
 * from the raw text. No data loss.
 */
async function deterministicFallback(
  questRunId: number,
  agentId: string,
  config: AgentConfig,
  rawOutput: string
): Promise<NormalizeResult> {
  const summary = rawOutput.slice(0, 100).replace(/\n/g, " ").trim();

  await prisma.normalizedResult.create({
    data: {
      questRunId,
      agentName: agentId,
      archetype: config.archetype,
      type: "update",
      severity: 2,
      confidence: 0.5,
      summary,
      evidence: JSON.stringify([{ title: `Raw output from ${config.name}` }]),
      timeSensitivity: "this_week",
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
    },
  });

  await prisma.questRun.update({
    where: { id: questRunId },
    data: { normalizerCostUsd: 0 },
  });

  console.log(`[normalizer] ${config.name} — deterministic fallback — 1 signal`);

  return {
    results: [
      {
        type: "update",
        severity: 2,
        confidence: 0.5,
        summary,
        evidence: JSON.stringify([{ title: `Raw output from ${config.name}` }]),
        timeSensitivity: "this_week",
      },
    ],
    costUsd: 0,
    inputTokens: 0,
    outputTokens: 0,
  };
}
