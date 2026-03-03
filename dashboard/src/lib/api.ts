import type { Agent, AgentStats, QuestRun, QuestRunDetail, NormalizedResult } from "./types";

const BASE_URL = process.env.GUILD_HALL_API_URL ?? "http://localhost:3001";

async function fetchAPI<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText} — ${path}`);
  }
  return res.json() as Promise<T>;
}

export function getAgents(): Promise<Agent[]> {
  return fetchAPI<Agent[]>("/agents", 60);
}

export function getStats(): Promise<AgentStats[]> {
  return fetchAPI<AgentStats[]>("/stats", 60);
}

export function getRuns(limit = 50): Promise<QuestRun[]> {
  return fetchAPI<QuestRun[]>(`/runs?limit=${limit}`, 30);
}

export function getRun(runId: number): Promise<QuestRunDetail> {
  return fetchAPI<QuestRunDetail>(`/runs/${runId}`, 30);
}

export function getSignals(params?: {
  limit?: number;
  type?: string;
  agent?: string;
  minSeverity?: number;
}): Promise<NormalizedResult[]> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.type) searchParams.set("type", params.type);
  if (params?.agent) searchParams.set("agent", params.agent);
  if (params?.minSeverity) searchParams.set("minSeverity", String(params.minSeverity));
  const qs = searchParams.toString();
  return fetchAPI<NormalizedResult[]>(`/signals${qs ? `?${qs}` : ""}`, 30);
}
