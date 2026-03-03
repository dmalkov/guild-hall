import { z } from "zod";

export const TriggerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("cron"),
    schedule: z.string(),
  }),
  z.object({
    type: z.literal("webhook"),
    path: z.string(),
  }),
  z.object({
    type: z.literal("after"),
    depends_on: z.array(z.string()),
  }),
  z.object({
    type: z.literal("manual"),
  }),
]);

export const AgentConfigSchema = z.object({
  name: z.string(),
  archetype: z.enum([
    "sage",
    "bard",
    "rogue",
    "mage",
    "knight",
    "blacksmith",
    "ranger",
  ]),
  station: z.string(),
  trigger: TriggerSchema,
  prompt_file: z.string(),
  model: z.enum(["haiku", "sonnet", "opus"]).default("sonnet"),
  dispatch_mode: z.enum(["sdk", "cli"]).default("sdk"),
  autonomy_tier: z.enum(["auto", "notify", "approve"]).default("notify"),
  output_path: z.string(),
  max_cost_per_run: z.number().default(0.50),
  max_retries: z.number().default(3),
  timeout_ms: z.number().default(120_000),
});

export const AgentsFileSchema = z.object({
  agents: z.record(z.string(), AgentConfigSchema),
});

export type Trigger = z.infer<typeof TriggerSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type AgentsFile = z.infer<typeof AgentsFileSchema>;

export const MODEL_IDS: Record<string, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-5-20250929",
  opus: "claude-opus-4-6",
};

export const MODEL_RATES: Record<string, { input: number; output: number }> = {
  haiku: { input: 0.80, output: 4.0 },
  sonnet: { input: 3.0, output: 15.0 },
  opus: { input: 15.0, output: 75.0 },
};
