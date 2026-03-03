export interface Agent {
  id: string;
  name: string;
  archetype: Archetype;
  trigger: string;
  tier: "auto" | "notify" | "approve";
  model: "haiku" | "sonnet" | "opus";
}

export interface QuestRun {
  id: number;
  agentName: string;
  archetype: string;
  startedAt: string;
  completedAt: string | null;
  status: "running" | "success" | "failed" | "timeout";
  triggerType: string | null;
  triggerData: string | null;
  modelUsed: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  normalizerCostUsd: number | null;
  rawOutput: string | null;
  outputPath: string | null;
  errorMessage: string | null;
  retryCount: number;
  xpEarned: number;
}

export interface QuestRunDetail extends QuestRun {
  normalizedResults: NormalizedResult[];
  feedback: QuestFeedback[];
}

export interface NormalizedResult {
  id: number;
  questRunId: number;
  agentName: string;
  archetype: string;
  type: SignalType;
  severity: number;
  confidence: number;
  summary: string;
  evidence: string;
  owner: string | null;
  timeSensitivity: "today" | "this_week" | "this_month";
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
  questRun?: { id: number; status: string; startedAt: string };
}

export interface QuestFeedback {
  id: number;
  questRunId: number;
  rating: "relevant" | "noise" | "question";
  note: string | null;
  createdAt: string;
}

export interface AgentStats {
  agentName: string;
  totalRuns: number;
  totalSuccess: number;
  totalCost: number;
  xp: number;
  level: number;
  precisionPct: number;
  lastCalibrated: string | null;
}

export type Archetype =
  | "sage"
  | "mage"
  | "rogue"
  | "knight"
  | "bard"
  | "blacksmith"
  | "ranger";

export type SignalType =
  | "insight"
  | "risk"
  | "update"
  | "anomaly"
  | "decision";
