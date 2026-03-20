---
name: debugging
description: Systematic debugging methodology. Use when debugging errors, crashes, performance issues, or unexpected behavior.
---

## Root Cause Analysis Framework

1. **5 Whys**: Ask "why" iteratively until you reach the root cause, not just the symptom. Example: App crashes → Why? Null pointer → Why? Data missing → Why? API changed → Why? No contract tests → Root cause: missing API contract validation.
2. **Fishbone (Ishikawa)**: Categorize potential causes: Code, Data, Environment, Configuration, Dependencies, Infrastructure. Systematically eliminate each category.

## Bisection Strategy

When a bug exists in the current state but not in a known-good state, bisect to find the introducing change:
- **Git bisect**: `git bisect start`, mark good/bad, let Git find the offending commit.
- **Code bisect**: Comment out half the suspected code. If the bug persists, it's in the other half. Repeat.
- **Config bisect**: Revert config changes one by one to isolate the cause.

## Reading Stack Traces

- Read bottom-to-top: the root cause is usually at the bottom (deepest frame).
- Focus on YOUR code frames, not framework/library frames.
- Note the exact line number, then check what changed recently on that line.
- For async stack traces, look for "caused by" or "previous error" chains.

## Logging Strategies

- Use structured logging (JSON format) with consistent fields: `timestamp`, `level`, `message`, `context`, `requestId`.
- Log levels: `ERROR` (failures needing action), `WARN` (degraded but functional), `INFO` (key business events), `DEBUG` (development detail).
- Add correlation IDs to trace requests across services.
- Log at boundaries: incoming requests, outgoing calls, state transitions.

## Memory Leak Detection

- Watch for monotonically increasing memory usage over time.
- Take heap snapshots at intervals, compare retained object counts.
- Common causes: event listeners not removed, closures capturing large scopes, growing caches without eviction, detached DOM nodes.
- Tools: Chrome DevTools Memory tab, `--inspect` flag for Node.js, `valgrind` for native code.

## Race Conditions

- Symptoms: intermittent failures, order-dependent bugs, works-on-my-machine issues.
- Look for: shared mutable state, missing locks/mutexes, async operations assumed to be sequential, missing `await` keywords.
- Fix with: proper synchronization, atomic operations, idempotent designs, or message queues.

## Debugger Best Practices

- **Conditional breakpoints**: Break only when a variable equals a specific value — avoids stepping through irrelevant iterations.
- **Watch expressions**: Monitor key variables without adding log statements.
- **Logpoints**: Print values without stopping execution (VS Code: right-click gutter → "Add Logpoint").

## Reproduction Methodology

1. Get exact steps from the reporter.
2. Identify the minimal reproduction — remove every element not needed to trigger the bug.
3. Document: OS, browser/runtime version, input data, configuration, timing.
4. Compare working vs broken environments systematically (diff configs, versions, env vars).
