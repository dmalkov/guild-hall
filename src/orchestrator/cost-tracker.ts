import { MODEL_RATES } from "../schema/agent-config.js";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  costUsd: number;
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rates = MODEL_RATES[model];
  if (!rates) throw new Error(`Unknown model: ${model}`);
  return (
    (inputTokens / 1_000_000) * rates.input +
    (outputTokens / 1_000_000) * rates.output
  );
}

/**
 * Parse token usage from Claude CLI --output-format json.
 *
 * Actual format from claude -p --output-format json:
 * {
 *   "type": "result",
 *   "result": "...",
 *   "total_cost_usd": 0.123,
 *   "usage": { "input_tokens": N, "output_tokens": N, "cache_creation_input_tokens": N, "cache_read_input_tokens": N },
 *   "modelUsage": { "claude-sonnet-4-6": { "inputTokens": N, "outputTokens": N, "costUSD": N, ... } }
 * }
 */
export function parseClaudeOutput(raw: string): {
  content: string;
  usage: TokenUsage | null;
} {
  try {
    const parsed = JSON.parse(raw);

    if (parsed.type === "result" && parsed.result !== undefined) {
      // Use total_cost_usd directly — most accurate
      const costUsd = parsed.total_cost_usd ?? 0;

      // Get token counts from usage block
      const u = parsed.usage ?? {};
      const inputTokens = u.input_tokens ?? 0;
      const outputTokens = u.output_tokens ?? 0;
      const cacheCreationTokens = u.cache_creation_input_tokens ?? 0;
      const cacheReadTokens = u.cache_read_input_tokens ?? 0;

      return {
        content: parsed.result,
        usage: {
          inputTokens: inputTokens + cacheCreationTokens + cacheReadTokens,
          outputTokens,
          cacheCreationTokens,
          cacheReadTokens,
          costUsd,
        },
      };
    }
  } catch {
    // Not JSON
  }

  return { content: raw, usage: null };
}
