#!/bin/bash
# Run an agent via claude CLI in a clean environment
# Usage: run-agent.sh <model> <max-budget> <system-prompt-file> <user-message>

set -euo pipefail

MODEL="${1:?model required}"
MAX_BUDGET="${2:?max-budget required}"
PROMPT_FILE="${3:?prompt file required}"
USER_MSG="${4:?user message required}"

# Clean Claude Code env vars
unset CLAUDECODE CLAUDE_CODE_SSE_PORT CLAUDE_CODE_ENTRYPOINT 2>/dev/null || true

SYSTEM_PROMPT=$(cat "$PROMPT_FILE")

exec claude -p "$USER_MSG" \
  --model "$MODEL" \
  --output-format json \
  --system-prompt "$SYSTEM_PROMPT" \
  --max-budget-usd "$MAX_BUDGET"
