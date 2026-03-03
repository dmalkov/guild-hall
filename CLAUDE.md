# The Guild Hall — Agent Runner

## What This Is
Autonomous agent runner with FF1/2 pixel art UI. Dispatches Claude Code agents on schedule (cron) or trigger (WhatsApp webhook), tracks costs, logs runs, and visualizes everything in a pixel-art guild hall.

## Architecture
- **Orchestrator** (`src/orchestrator/`): Dispatcher, inbox poller, cost tracker, dead letter queue
- **Schema** (`src/schema/`): QuestResult (universal agent output contract), agent config types
- **Intelligence** (`src/intelligence/`): Signal normalizer (The Scribe), quality gate, calibration
- **Prompts** (`src/prompts/`): Per-agent system prompts
- **UI** (`ui/`): Fork of paulrobello/claude-office, reskinned to FF1/2 (separate project, gitignored)
- **Database**: SQLite via Prisma (quest_runs, quest_feedback, agent_stats)

## Stack
- TypeScript, Node.js (ESM)
- Prisma + SQLite
- YAML for agent registry
- Zod for runtime validation
- Claude CLI (`claude -p`) for agent execution

## Key Conventions
- Every agent run logs to `quest_runs` with full token/cost tracking
- Agent configs live in `agents.yaml` — declarative, not code
- All agent output follows the QuestResult schema
- Cost tracking is mandatory — no run without cost logging
- Model rates: Opus $15/$75, Sonnet $3/$15, Haiku $0.80/$4 per 1M tokens

## File Outputs
- Agent outputs go to Obsidian vault at paths defined in agents.yaml
- Run logs go to SQLite
- State checkpoints go to `25-AI-Agents/{agent}/state/`
