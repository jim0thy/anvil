/**
 * anvil Copilot CLI Extension
 *
 * Programmatic hooks that supplement the declarative plugin with capabilities
 * shell scripts can't handle: keyword-based mode detection, plan-aware boulder,
 * and intelligent error recovery guidance.
 */
import { joinSession } from "@github/copilot-sdk/extension";

joinSession(async (session) => {
  // Track which error types we've already injected recovery for (avoid spam)
  const seenErrorTypes = new Set();

  return {
    sessionConfig: {
      hooks: {
        /**
         * Hook: onUserPromptSubmitted
         *
         * Fires before the prompt reaches the model. We use it for two things:
         * 1. Keyword detection — route to the right agent/mode automatically
         * 2. Advanced boulder — read plan.md and nudge toward pending items
         */
        onUserPromptSubmitted: async ({ prompt }) => {
          const chunks = [];

          try {
            // --- 1. Keyword Detection ---
            // Scan the prompt for mode keywords and inject routing context.
            // Order matters: first match wins (most specific first).
            const lower = prompt.toLowerCase();

            const keywordMap = [
              {
                keywords: ["ultrawork", "deep"],
                context:
                  "This is a deep work task. Use the deep-worker agent. Do not ask for clarification. Research thoroughly before acting.",
              },
              {
                keywords: ["quick", "fast"],
                context:
                  "This is a quick task. Handle it directly or use the utility agent. Minimize overhead.",
              },
              {
                keywords: ["search", "find", "research"],
                context:
                  "This is a research task. Use the researcher agent. Search multiple sources in parallel.",
              },
              {
                keywords: ["review", "audit"],
                context:
                  "This is a review task. Use the critic agent for harsh analysis and the reviewer for constructive feedback.",
              },
              {
                keywords: ["plan", "architect"],
                context:
                  "This is a planning task. Use the planner agent. Interview first, then produce structured plan.",
              },
              {
                keywords: ["fleet", "parallel"],
                context:
                  "This is a large parallel task. Use the commander agent for fleet execution.",
              },
            ];

            for (const { keywords, context } of keywordMap) {
              if (keywords.some((kw) => lower.includes(kw))) {
                chunks.push(context);
                break; // first match wins
              }
            }

            // --- 2. Advanced Boulder ---
            // Read plan.md from the session workspace and look for unchecked items.
            // This is smarter than the shell-script boulder because it parses
            // the plan directly rather than relying on file-system heuristics.
            try {
              const planContent = await readPlanFile(session);
              if (planContent) {
                const unchecked = planContent
                  .split("\n")
                  .filter((line) => /^\s*-\s*\[\s\]/.test(line))
                  .map((line) => line.replace(/^\s*-\s*\[\s\]\s*/, "").trim());

                if (unchecked.length > 0) {
                  chunks.push(
                    `🪨 Boulder: There are ${unchecked.length} incomplete plan items. ` +
                      `The next pending item is: ${unchecked[0]}. ` +
                      `Consider continuing this work.`
                  );
                }
              }
            } catch (err) {
              // plan.md may not exist — that's fine, skip silently
              console.error("[anvil] boulder: could not read plan.md:", err.message);
            }
          } catch (err) {
            // Never crash the hook — log and move on
            console.error("[anvil] onUserPromptSubmitted error:", err);
          }

          return chunks.length > 0
            ? { additionalContext: chunks.join("\n\n") }
            : {};
        },

        /**
         * Hook: onPostToolUse
         *
         * Fires after a tool finishes. We inspect the result for common error
         * patterns and inject recovery guidance — but only once per error type
         * per session to avoid flooding the context.
         */
        onPostToolUse: async ({ toolName, result }) => {
          try {
            const output = typeof result === "string" ? result : JSON.stringify(result ?? "");

            // --- Bash / execute failures (non-zero exit) ---
            if (
              (toolName === "bash" || toolName === "execute") &&
              isFailedCommand(output)
            ) {
              if (!seenErrorTypes.has("bash_fail")) {
                seenErrorTypes.add("bash_fail");
                return {
                  additionalContext:
                    "The previous command failed. Analyze the error output carefully. " +
                    "Common fixes: check file paths, permissions, missing dependencies, syntax errors.",
                };
              }
            }

            // --- Edit failures (file not found, match not found) ---
            if (
              toolName === "edit" &&
              isEditFailure(output)
            ) {
              if (!seenErrorTypes.has("edit_fail")) {
                seenErrorTypes.add("edit_fail");
                return {
                  additionalContext:
                    "The edit operation failed. Verify the file path exists and the old_str matches exactly. " +
                    "Use the read tool to check current file contents.",
                };
              }
            }
          } catch (err) {
            // Never crash the hook
            console.error("[anvil] onPostToolUse error:", err);
          }

          return {};
        },
      },
    },
  };
});

// ---------------------------------------------------------------------------
// Helper: Read plan.md from the session workspace
// ---------------------------------------------------------------------------

/**
 * Attempts to read plan.md from the session workspace.
 * Returns the file contents as a string, or null if unavailable.
 */
async function readPlanFile(session) {
  // Try the session workspace API if available
  if (session?.workspace?.readFile) {
    const content = await session.workspace.readFile("plan.md");
    return content ?? null;
  }

  // Fallback: try reading from the well-known session-state path
  if (session?.workspacePath) {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const filePath = join(session.workspacePath, "plan.md");
    try {
      return await readFile(filePath, "utf-8");
    } catch {
      return null;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Helper: Detect failed bash/execute commands
// ---------------------------------------------------------------------------

function isFailedCommand(output) {
  return (
    /exit(ed with exit)?\s*code\s*[1-9]/i.test(output) ||
    /command not found/i.test(output) ||
    /permission denied/i.test(output) ||
    /no such file or directory/i.test(output)
  );
}

// ---------------------------------------------------------------------------
// Helper: Detect failed edit operations
// ---------------------------------------------------------------------------

function isEditFailure(output) {
  return (
    /file not found/i.test(output) ||
    /no such file/i.test(output) ||
    /match not found/i.test(output) ||
    /old_str.*not found/i.test(output) ||
    /not unique/i.test(output)
  );
}
