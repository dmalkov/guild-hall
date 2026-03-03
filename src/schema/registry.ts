import { readFileSync } from "fs";
import { parse as parseYaml } from "yaml";
import { AgentsFileSchema, type AgentConfig } from "./agent-config.js";

export class AgentRegistry {
  private agents: Map<string, AgentConfig>;

  constructor(yamlPath: string) {
    const raw = readFileSync(yamlPath, "utf-8");
    const parsed = parseYaml(raw);
    const validated = AgentsFileSchema.parse(parsed);
    this.agents = new Map(Object.entries(validated.agents));
  }

  get(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId);
  }

  getAll(): Map<string, AgentConfig> {
    return new Map(this.agents);
  }

  getByCron(): [string, AgentConfig][] {
    return [...this.agents].filter(
      ([, cfg]) => cfg.trigger.type === "cron"
    );
  }

  getByTriggerType(type: string): [string, AgentConfig][] {
    return [...this.agents].filter(([, cfg]) => cfg.trigger.type === type);
  }

  getDependents(completedAgentId: string): [string, AgentConfig][] {
    return [...this.agents].filter(([, cfg]) => {
      if (cfg.trigger.type !== "after") return false;
      return cfg.trigger.depends_on.includes(completedAgentId);
    });
  }
}
