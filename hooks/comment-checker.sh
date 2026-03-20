#!/bin/bash
# comment-checker.sh — Detects AI-generated "slop" patterns in recently modified files.
# Runs as a postToolUse hook; only activates after edit/create tool calls.
# Outputs warnings to stderr but always exits 0 (never blocks).

set -euo pipefail

# Hook context is provided via environment variables.
# COPILOT_HOOK_TOOL_NAME — the tool that was just used
# COPILOT_HOOK_FILE_PATH — the file that was modified (if applicable)
TOOL_NAME="${COPILOT_HOOK_TOOL_NAME:-}"
FILE_PATH="${COPILOT_HOOK_FILE_PATH:-}"

# Only run after edit or create tool calls
if [[ "$TOOL_NAME" != "edit" && "$TOOL_NAME" != "create" ]]; then
  exit 0
fi

# Need a file path to scan
if [[ -z "$FILE_PATH" || ! -f "$FILE_PATH" ]]; then
  exit 0
fi

# Skip binary files
if file --brief --mime "$FILE_PATH" 2>/dev/null | grep -qv 'text/'; then
  exit 0
fi

WARNINGS=0

# --- Pattern checks ---

# Excessive em dashes (—) and en dashes (–): flag if 3+ occurrences
EM_DASH_COUNT=$(grep -co '[—–]' "$FILE_PATH" 2>/dev/null | paste -sd+ - | bc 2>/dev/null || echo 0)
if [[ "$EM_DASH_COUNT" -ge 3 ]]; then
  echo "⚠️ AI slop detected: excessive em/en dashes (${EM_DASH_COUNT} found) in $FILE_PATH" >&2
  WARNINGS=$((WARNINGS + 1))
fi

# Overused AI buzzwords
BUZZWORDS='streamline|leverage|utilize|enhance|facilitate|robust|seamless|cutting-edge|delve|holistic'
if grep -Eiq "\b($BUZZWORDS)\b" "$FILE_PATH" 2>/dev/null; then
  MATCHES=$(grep -Eio "\b($BUZZWORDS)\b" "$FILE_PATH" 2>/dev/null | sort -fu | paste -sd', ' -)
  echo "⚠️ AI slop detected: overused words [$MATCHES] in $FILE_PATH" >&2
  WARNINGS=$((WARNINGS + 1))
fi

# Filler phrases
FILLER_PHRASES=(
  "it's worth noting"
  "in order to"
  "it's important to note"
  "at the end of the day"
  "moving forward"
)
for phrase in "${FILLER_PHRASES[@]}"; do
  if grep -qi "$phrase" "$FILE_PATH" 2>/dev/null; then
    echo "⚠️ AI slop detected: filler phrase \"$phrase\" in $FILE_PATH" >&2
    WARNINGS=$((WARNINGS + 1))
  fi
done

# Excessive hedging words
HEDGING='arguably|essentially|fundamentally|generally speaking'
if grep -Eiq "\b($HEDGING)\b" "$FILE_PATH" 2>/dev/null; then
  MATCHES=$(grep -Eio "\b($HEDGING)\b" "$FILE_PATH" 2>/dev/null | sort -fu | paste -sd', ' -)
  echo "⚠️ AI slop detected: hedging language [$MATCHES] in $FILE_PATH" >&2
  WARNINGS=$((WARNINGS + 1))
fi

if [[ "$WARNINGS" -gt 0 ]]; then
  echo "⚠️ Total: $WARNINGS slop warning(s) in $FILE_PATH" >&2
fi

exit 0
