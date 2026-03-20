#!/bin/bash
# session-logger.sh — Logs session activity on session end.
# Creates ~/.anvil/sessions/ if needed and appends a log entry
# with timestamp, working directory, and session duration.
# Always exits 0.

set -euo pipefail

LOG_DIR="${HOME}/.anvil/sessions"
LOG_FILE="${LOG_DIR}/log.txt"

# Ensure the log directory exists
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
WORKING_DIR=$(pwd)

# Session duration from environment (set by the host if available)
DURATION="${COPILOT_HOOK_SESSION_DURATION:-unknown}"

# Write the log entry
echo "[$TIMESTAMP] dir=$WORKING_DIR duration=$DURATION" >> "$LOG_FILE"

exit 0
