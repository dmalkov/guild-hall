import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { type AgentConfig, MODEL_RATES } from "../schema/agent-config.js";

const anthropic = new Anthropic();
const HAIKU_MODEL = "claude-haiku-4-5-20251001";

export interface NormalizedSignal {
  type: string;
  severity: number;
  confidence: number;
  summary: string;
  evidence: string;
  owner?: string;
  timeSensitivity: string;
}

export interface GateResult {
  verdict: "pass" | "hold" | "escalate";
  filtered: NormalizedSignal[];
  dropped: number;
  costUsd: number;
}

const GateResponseSchema = z.object({
  verdict: z.enum(["pass", "hold", "escalate"]),
  keep: z.array(z.number()), // indices to keep
  reason: z.string().optional(),
});

const GATE_SYSTEM_PROMPT = `You are a quality gate for an intelligence briefing system. Review normalized signals and decide which to keep.

Rules:
- DROP signals with severity < 3 (not worth attention)
- DROP signals with no meaningful evidence
- MERGE redundant signals (keep the better one)
- Keep signals that are actionable, timely, or represent real risks

Return JSON:
{
  "verdict": "pass" | "hold" | "escalate",
  "keep": [0, 2, 3],  // indices of signals to keep (0-based)
  "reason": "optional explanation"
}

Verdict guide:
- "pass": signals are clean, deliver them
- "hold": signals are low quality or irrelevant, suppress delivery
- "escalate": contains severity 5 items that need immediate attention`;

export async function qualityGate(
  results: NormalizedSignal[],
  config: AgentConfig
): Promise<GateResult> {
  // Skip gate for auto-tier agents
  if (config.autonomy_tier === "auto") {
    return { verdict: "pass", filtered: results, dropped: 0, costUsd: 0 };
  }

  if (results.length === 0) {
    return { verdict: "pass", filtered: [], dropped: 0, costUsd: 0 };
  }

  try {
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 512,
      system: GATE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Review these ${results.length} signals from ${config.name}:\n\n${JSON.stringify(results, null, 2)}`,
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

    const jsonStr = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    const gateResponse = GateResponseSchema.parse(parsed);

    const filtered = gateResponse.keep
      .filter((i) => i >= 0 && i < results.length)
      .map((i) => results[i]);

    console.log(
      `[quality-gate] ${config.name} — verdict: ${gateResponse.verdict} — kept ${filtered.length}/${results.length} — $${costUsd.toFixed(4)}`
    );

    return {
      verdict: gateResponse.verdict,
      filtered,
      dropped: results.length - filtered.length,
      costUsd,
    };
  } catch (err) {
    console.error(
      `[quality-gate] ${config.name} — LLM gate failed, using deterministic fallback:`,
      err instanceof Error ? err.message : err
    );
    return deterministicGate(results, config);
  }
}

/**
 * Deterministic fallback gate — hard rules, no LLM.
 */
function deterministicGate(
  results: NormalizedSignal[],
  config: AgentConfig
): GateResult {
  const filtered = results.filter((r) => {
    if (r.severity < 3) return false;
    // Check evidence is not empty
    try {
      const evidence = JSON.parse(r.evidence);
      if (!Array.isArray(evidence) || evidence.length === 0) return false;
    } catch {
      return false;
    }
    return true;
  });

  const hasEscalation = filtered.some((r) => r.severity >= 5);
  const verdict = hasEscalation ? "escalate" : filtered.length > 0 ? "pass" : "hold";

  console.log(
    `[quality-gate] ${config.name} — deterministic fallback — verdict: ${verdict} — kept ${filtered.length}/${results.length}`
  );

  return {
    verdict,
    filtered,
    dropped: results.length - filtered.length,
    costUsd: 0,
  };
}
