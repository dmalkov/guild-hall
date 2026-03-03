import { z } from "zod";

export const EvidenceSchema = z.object({
  url: z.string().url(),
  title: z.string(),
  snippet: z.string().optional(),
});

export const QuestResultSchema = z.object({
  id: z.string(),
  agent_name: z.string(),
  archetype: z.string(),
  type: z.enum(["insight", "risk", "update", "anomaly", "decision"]),
  severity: z.number().min(1).max(5),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  evidence: z.array(EvidenceSchema),
  owner: z.string().optional(),
  time_sensitivity: z.enum(["today", "this_week", "this_month"]),
  output_path: z.string(),
  cost_usd: z.number(),
  tokens: z.object({
    input: z.number(),
    output: z.number(),
  }),
});

export type Evidence = z.infer<typeof EvidenceSchema>;
export type QuestResult = z.infer<typeof QuestResultSchema>;
