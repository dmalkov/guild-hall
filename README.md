# The Guild Hall — Agent Runner

Autonomous agent runner with FF1/2 pixel art UI. Dispatches Claude agents on schedule (cron) or trigger (webhook), tracks costs, logs runs, normalizes signals, and visualizes everything in a pixel-art guild hall.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  GUILD HALL UI (separate repo, FF1/2 reskin)    │
│  Fork: paulrobello/claude-office + PixiJS       │
├─────────────────────────────────────────────────┤
│  ORCHESTRATOR                                   │
│  - Agent registry (agents.yaml → typed configs) │
│  - Dispatcher (Anthropic SDK + Claude CLI)      │
│  - Cost tracker (per-run token/cost logging)    │
│  - Scheduler (node-cron + dependency chaining)  │
│  - Hono HTTP API (manual/webhook triggers)      │
├─────────────────────────────────────────────────┤
│  INTELLIGENCE                                   │
│  - Signal normalizer (Haiku-powered extraction) │
│  - Quality gate (Haiku review before delivery)  │
│  - Calibration (weekly learning from feedback)  │
├─────────────────────────────────────────────────┤
│  STORAGE                                        │
│  - SQLite via Prisma (runs, feedback, stats)    │
│  - Obsidian vault (agent outputs, state files)  │
└─────────────────────────────────────────────────┘
```

## Agent Roster

| Character | Archetype | Trigger | Model | Tier | Cost/Run |
|-----------|-----------|---------|-------|------|----------|
| The Chronicler | Sage | Webhook `/api/ideas` | Sonnet | Auto | ~$0.30 |
| The Oracle | Mage | Cron 7 AM daily | Sonnet | Auto | ~$0.50 |
| The Whisper | Rogue | Cron 8 AM weekdays | Sonnet | Auto | ~$0.30 |
| The Scribe | Sage | After Oracle + Whisper | Haiku | Auto | ~$0.05 |

Future agents: The Troubadour (Bard), The Sentinel (Knight), The Hawkeye (Ranger), The Artificer (Blacksmith).

## Stack

- TypeScript (ESM), Node.js
- Prisma + SQLite
- Anthropic SDK (`@anthropic-ai/sdk`) + Claude CLI (`claude -p`)
- Hono (HTTP API), node-cron (scheduler)
- Zod (runtime validation), YAML (agent registry)
- Docker + Dokploy (deployment)

## Quick Start

```bash
# Install
npm install

# Setup database
npx prisma db push

# Configure
cp .env.example .env
# Add ANTHROPIC_API_KEY to .env

# Development
npm run dev

# CLI commands
npx tsx src/main.ts serve [port]       # Start scheduler + HTTP API
npx tsx src/main.ts dispatch <agent>   # Manual dispatch
npx tsx src/main.ts list               # Show registered agents
npx tsx src/main.ts stats              # Show agent statistics
```

## HTTP API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/agents` | GET | List all agents |
| `/dispatch/:agentId` | POST | Trigger agent (body: `{ input }`) |
| `/runs` | GET | Recent quest runs (`?limit=N`) |
| `/stats` | GET | Agent statistics |

## Project Structure

```
guild-hall/
├── agents.yaml              # Agent registry (declarative configs)
├── src/
│   ├── main.ts              # CLI entry point (serve|dispatch|list|stats)
│   ├── env.ts               # Environment loader
│   ├── schema/
│   │   ├── agent-config.ts  # AgentConfig + Trigger schemas (Zod)
│   │   ├── quest-result.ts  # QuestResult schema (signal types)
│   │   └── registry.ts      # YAML parser + in-memory lookup
│   ├── orchestrator/
│   │   ├── dispatcher.ts    # SDK + CLI dispatch modes
│   │   ├── cost-tracker.ts  # Token counting + cost calculation
│   │   ├── scheduler.ts     # Cron jobs + dependency triggering
│   │   └── server.ts        # Hono HTTP API
│   ├── intelligence/
│   │   ├── normalizer.ts    # Haiku signal extraction
│   │   └── quality-gate.ts  # Haiku quality filtering
│   └── prompts/
│       ├── night-thoughts.md
│       ├── vibe-digest.md
│       ├── slack-digest.md
│       └── scribe.md
├── prisma/
│   └── schema.prisma        # SQLite schema (5 models)
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Autonomy Tiers

| Tier | Behavior | Use Case |
|------|----------|----------|
| **Auto** | Execute + log silently | Low-risk: digests, research |
| **Notify** | Execute + send summary notification | Medium-risk: content drafts |
| **Approve** | Preview + block until confirmed | High-risk: trading, external actions |

## Cost Tracking

Every run logs input/output tokens and cost (USD). Model rates:

| Model | Input | Output |
|-------|-------|--------|
| Haiku | $0.80/1M | $4/1M |
| Sonnet | $3/1M | $15/1M |
| Opus | $15/1M | $75/1M |

Daily budget default: $5.00. Estimated daily cost for 4 agents: ~$0.70.

## Forked From

- [paulrobello/claude-office](https://github.com/paulrobello/claude-office) — Pixel art office UI, PixiJS rendering, WebSocket state sync
- [jimmychoi-boop/brief](https://github.com/jimmychoi-boop/brief) — Signal schema, normalizer, calibration, quality gate patterns
