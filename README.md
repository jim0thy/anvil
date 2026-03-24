# Anvil

> Multi-agent orchestration plugin for [GitHub Copilot CLI](https://docs.github.com/copilot/concepts/agents/about-copilot-cli). 11 specialized agents with subagent delegation, 6 skills, lifecycle hooks, and MCP integrations.

## Install

```bash
copilot plugin install jim0thy/anvil
```

For local development:

```bash
copilot plugin install ./anvil
```

## What This Does

Atlas turns Copilot CLI into a **multi-agent orchestration system**. Instead of one agent doing everything, tasks are classified and routed to specialists — each optimized for a specific domain. Agents delegate to each other, run in parallel, and chain quality reviews automatically.

### Key Features

- **11 custom agents** with subagent delegation — agents invoke other agents via Copilot's `task` tool
- **Parallel fleet execution** — the commander agent decomposes large tasks and runs multiple workers simultaneously
- **Automatic quality chains** — implementations are reviewed by code-review → reviewer → critic before presenting results
- **Research-before-act** — specialist agents use explore agents to understand codebases before making changes
- **6 domain skills** — git, testing, debugging, API design, frontend, and Playwright expertise
- **3 MCP integrations** — Exa web search, Context7 docs, Grep.app code search
- **Lifecycle hooks** — AI slop detection, todo continuation enforcement, session logging

## Agents

### Entry Point

| Agent | Description | Select With |
|---|---|---|
| **anvil** | Main entry point. Classifies tasks, delegates to specialists, manages parallel execution, chains quality reviews. | `/agent` → anvil |

### Internal Orchestrators

| Agent | Description | Auto-Infer |
|---|---|---|
| **commander** | Fleet orchestrator for large tasks. Decomposes into parallel work items, manages background agents, coordinates dependencies. | Delegated by anvil |

### Specialists

| Agent | Description | Auto-Infer |
|---|---|---|
| **deep-worker** | Autonomous end-to-end executor. Researches codebase, implements fully, self-reviews. | ✅ |
| **planner** | Strategic planner. Interviews for requirements, assesses codebase, produces structured plans. | ✅ |
| **architect** | Architecture advisor and debugging specialist. Analyzes patterns, dependencies, coupling. | ✅ |
| **researcher** | Documentation and search specialist. Parallel multi-source research with citations. | ✅ |
| **reviewer** | Plan and implementation reviewer. Structured constructive feedback. | ✅ |
| **critic** | Harsh code quality reviewer. Bugs, security, performance. Reports only problems. | ❌ (opt-in) |
| **vision** | Multimodal analysis. Screenshots, diagrams, UI comparison, accessibility audit. | ✅ |

### Internal Utilities

These agents are used by other agents — not directly selectable by users.

| Agent | Description |
|---|---|
| **scout** | Fast codebase search. Returns raw file paths and matches. |
| **utility** | Lightweight utility for quick single-file tasks. |

## Skills

Invoke skills explicitly with `/skill-name` or let Copilot auto-load them when relevant.

| Skill | Description |
|---|---|
| `/git-master` | Advanced Git operations — rebasing, bisect, conflict resolution, conventional commits |
| `/playwright` | Playwright browser testing — page objects, selectors, async patterns, CI integration |
| `/frontend-ui-ux` | Frontend development — WCAG accessibility, responsive design, component architecture |
| `/debugging` | Systematic debugging — root cause analysis, bisection, memory leaks, race conditions |
| `/api-design` | REST API design — resource naming, pagination, error handling, versioning, OpenAPI |
| `/testing` | Test strategy — TDD workflow, test pyramid, mocking, coverage, mutation testing |

## MCP Servers

Atlas configures three external MCP servers. Set the required environment variables to enable them.

| Server | Purpose | Setup |
|---|---|---|
| **Exa** | Web search | Set `EXA_API_KEY` env var ([get key](https://exa.ai)) |
| **Context7** | Library documentation | Works out of the box (npx) |
| **Grep.app** | GitHub code search | Works out of the box (npx) |

All MCP servers are optional — missing API keys or npx failures won't break the plugin.

## Hooks

| Hook | Trigger | What It Does |
|---|---|---|
| **comment-checker** | After edit/create | Detects AI slop patterns (buzzwords, filler phrases, excessive dashes) |
| **boulder** | Before each prompt | Reminds about incomplete todos from `.anvil-todos` file |
| **session-logger** | Session end | Logs session activity to `~/.anvil/sessions/log.txt` |

### Boulder (Todo Continuation)

Create a `.anvil-todos` file in your project root:

```
[ ] Implement user authentication
[ ] Add rate limiting to API
[x] Set up database migrations
```

The boulder hook will remind you about incomplete tasks at the start of each prompt.

## How Delegation Works

Anvil classifies incoming tasks and delegates to the best specialist:

```
User: "Add OAuth2 login to the API"

Anvil thinks:
  → Category: complex autonomous work
  → Delegates to: deep-worker

Deep-worker:
  1. task(agent_type="explore") → understands auth patterns in codebase
  2. task(agent_type="explore") → finds existing middleware
  3. Implements OAuth2 login flow
  4. task(agent_type="task") → runs tests
  5. task(agent_type="code-review") → self-review

Anvil:
  6. task(agent_type="reviewer") → checks against requirements
  7. Presents result to user
```

For large tasks, the commander parallelizes:

```
Commander:
  → Spawns deep-worker A (background) → auth module
  → Spawns deep-worker B (background) → user model
  → Spawns deep-worker C (background) → API routes
  → Monitors all three, sends follow-ups
  → Runs quality gate after all complete
```

## Customization

### Override Agent Prompts

Fork this repo and edit the `.agent.md` files in `agents/`. Each file is YAML frontmatter + markdown system prompt.

### Add Skills

Create a new directory under `skills/` with a `SKILL.md` file:

```markdown
---
name: my-custom-skill
description: When to use this skill
---

Instructions for the skill...
```

### Add MCP Servers

Edit `.mcp.json` to add more MCP server configurations.

## License

MIT
