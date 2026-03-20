# Oh My OpenAgent (oh-my-opencode) — Technical Deep-Dive

## Executive Summary

[**code-yeongyu/oh-my-openagent**](https://github.com/code-yeongyu/oh-my-openagent) (published as `oh-my-opencode` on npm) is a large-scale, batteries-included **plugin for OpenCode** (an open-source fork of Claude Code) that transforms it into a multi-model, multi-agent orchestration platform. At version **3.11.0**, it comprises **~160k LOC across 1,268 TypeScript files**, delivering 11 named AI agents, 46 lifecycle hooks, 26 tools, a skill/command system, built-in MCP servers, and full Claude Code compatibility[^1][^2]. The project is authored primarily by **YeonGyu-Kim** (@code-yeongyu), licensed under a custom **Sustainable Use License (SUL-1.0)**[^3], and builds on the `@opencode-ai/plugin` SDK. The core thesis is that no single AI model dominates all tasks — the plugin orchestrates Claude, GPT, Gemini, Kimi, GLM and others, routing each task category to the optimal model automatically.

---

## Architecture / System Overview

```
                              ┌──────────────────────────────────────┐
                              │         OpenCode Runtime             │
                              │  (Claude Code fork, plugin host)     │
                              └──────────────┬───────────────────────┘
                                             │ Plugin API
                              ┌──────────────▼───────────────────────┐
                              │     OhMyOpenCodePlugin (index.ts)    │
                              │                                      │
                              │  loadPluginConfig()                  │
                              │  createManagers()                    │
                              │  createTools()                       │
                              │  createHooks()                       │
                              │  createPluginInterface()             │
                              └───┬──────┬──────┬──────┬────────────┘
                                  │      │      │      │
                    ┌─────────────▼──┐ ┌─▼──────▼─┐ ┌──▼──────────┐
                    │  8 Plugin Hook │ │ 26 Tools  │ │ 46 Hooks    │
                    │  Handlers      │ │ Registry  │ │ (3 tiers)   │
                    └────────────────┘ └───────────┘ └─────────────┘
                          │                 │              │
          ┌───────────────┼─────────────────┼──────────────┤
          │               │                 │              │
    ┌─────▼─────┐  ┌──────▼──────┐  ┌──────▼──────┐  ┌───▼────────────┐
    │ 11 Agents │  │ Background  │  │   Tmux      │  │  Skill/MCP     │
    │           │  │ Manager     │  │  Session    │  │  Manager       │
    │ Sisyphus  │  │ (5/model)   │  │  Manager    │  │                │
    │ Hephaestus│  └─────────────┘  └─────────────┘  │ Built-in MCPs: │
    │ Oracle    │                                      │  Exa, Context7 │
    │ Librarian │  ┌─────────────┐                     │  Grep.app      │
    │ Explore   │  │  Config     │                     └────────────────┘
    │ Atlas     │  │  System     │
    │ Prometheus│  │ (Zod v4)    │
    │ Metis     │  │ JSONC merge │
    │ Momus     │  └─────────────┘
    │ Multimodal│
    │ SisJunior │
    └───────────┘
```

### Initialization Flow

The plugin loads via a single async entry point `OhMyOpenCodePlugin(ctx)` in `src/index.ts`[^4]:

1. **`loadPluginConfig()`** — Reads JSONC configs from user (`~/.config/opencode/oh-my-opencode.jsonc`) and project (`.opencode/oh-my-opencode.jsonc`), merges with deep-merge, validates via Zod v4, and auto-migrates legacy keys[^5].
2. **`createManagers()`** — Instantiates `TmuxSessionManager`, `BackgroundManager`, `SkillMcpManager`, and `ConfigHandler`[^6].
3. **`createTools()`** — Discovers skills (4-scope loading), builds available categories, and assembles the 26-tool registry[^7].
4. **`createHooks()`** — Composes Core (37) + Continuation (7) + Skill (2) = 46 hooks across three tiers[^8].
5. **`createPluginInterface()`** — Maps 8 OpenCode hook handlers (config, tool, chat.message, chat.params, chat.headers, event, tool.execute.before, tool.execute.after, experimental.chat.messages.transform)[^9].

---

## Agent System (11 Agents)

The agent system is the intellectual core of the project. Each agent is a factory function (`createXXXAgent`) returning an OpenCode `AgentConfig`, with a static `mode` property determining UI model behavior[^10][^11].

### Agent Modes

| Mode | Behavior | Agents |
|------|----------|--------|
| `primary` | Respects user's UI-selected model | Sisyphus, Atlas |
| `subagent` | Uses own fallback chain, ignores UI | Oracle, Explore, Librarian, etc. |
| `all` | Available in both contexts | (OpenCode compatibility) |

### Agent Catalog

| Agent | Default Model(s) | Role | Key File |
|-------|-------------------|------|----------|
| **Sisyphus** | `claude-opus-4-6` / `kimi-k2.5` / `glm-5` | Main orchestrator. Plans, delegates, drives parallel execution | `src/agents/sisyphus.ts` (21.7KB)[^12] |
| **Hephaestus** | `gpt-5.3-codex` | Autonomous deep worker. Explores codebase, executes end-to-end | `src/agents/hephaestus/`[^13] |
| **Prometheus** | `claude-opus-4-6` / `kimi-k2.5` / `glm-5` | Strategic planner. Interview mode, builds detailed plans | `src/agents/prometheus/`[^14] |
| **Oracle** | Fallback chain (multiple) | Architecture advisor, debugging specialist | `src/agents/oracle.ts` (14.7KB)[^15] |
| **Librarian** | Fallback chain (multiple) | Documentation and code search specialist | `src/agents/librarian.ts` (11.8KB)[^16] |
| **Explore** | (cheap/fast model) | Fast codebase grep/search | `src/agents/explore.ts` (3.9KB)[^17] |
| **Metis** | (variable) | Plan consultant, reviews Prometheus plans | `src/agents/metis.ts` (13KB)[^18] |
| **Momus** | (variable, xhigh variant) | Code critic, quality reviewer | `src/agents/momus.ts` (14.4KB)[^19] |
| **Atlas** | (primary mode) | Alternate main orchestrator | `src/agents/atlas/`[^20] |
| **Multimodal Looker** | (vision model) | Image/screenshot analysis | `src/agents/multimodal-looker.ts`[^21] |
| **Sisyphus Junior** | (variable) | Lightweight utility runner | `src/agents/sisyphus-junior/`[^22] |

### Dynamic Agent Prompt Builder

The prompt system is highly dynamic. `dynamic-agent-prompt-builder.ts` (19.3KB) builds Sisyphus's system prompt at runtime based on which agents are available, what skills are loaded, and what categories exist[^23]. Each agent exports `AgentPromptMetadata` declaring its category, cost, delegation triggers, and usage conditions[^10].

### Category-Based Delegation

When Sisyphus delegates work, it specifies a **category** rather than a specific model. The category auto-routes to the best available model:

| Category | Default Model | Domain |
|----------|---------------|--------|
| `visual-engineering` | `gemini-3.1-pro` high | Frontend, UI/UX |
| `ultrabrain` | `gpt-5.4` xhigh | Hard logic, architecture |
| `deep` | `gpt-5.3-codex` medium | Autonomous research + execution |
| `artistry` | `gemini-3.1-pro` high | Creative approaches |
| `quick` | `claude-haiku-4-5` | Trivial single-file tasks |
| `unspecified-low` | `claude-sonnet-4-6` | Moderate effort |
| `unspecified-high` | `claude-opus-4-6` max | High effort |
| `writing` | `kimi-k2p5` | Documentation |

Model resolution follows a 4-step chain: **override → category-default → provider-fallback → system-default**[^2].

---

## Tool System (26 Tools)

Tools are registered via `createToolRegistry()` in `src/plugin/tool-registry.ts`. Two patterns: factory functions (`createXXXTool`) for 19 tools, direct `ToolDefinition` for 7 (LSP suite + interactive_bash)[^24].

### Tool Categories

| Category | Tools | Key Features |
|----------|-------|--------------|
| **Task Management** (4) | `task_create`, `task_list`, `task_get`, `task_update` | Full task lifecycle with blocking/dependencies |
| **Delegation** (1) | `task` (delegate_task) | Routes to 8 built-in categories with model matching |
| **Agent Invocation** (1) | `call_omo_agent` | Direct agent invocation by name |
| **Background Tasks** (2) | `background_output`, `background_cancel` | Monitor/cancel parallel background agents |
| **LSP Refactoring** (6) | `lsp_goto_definition`, `lsp_find_references`, `lsp_symbols`, `lsp_diagnostics`, `lsp_prepare_rename`, `lsp_rename` | Full IDE-grade code intelligence |
| **Code Search** (4) | `ast_grep_search`, `ast_grep_replace`, `grep`, `glob` | AST-aware search across 25 languages |
| **Session History** (4) | `session_list`, `session_read`, `session_search`, `session_info` | Query and analyze past sessions |
| **Skill/Command** (2) | `skill`, `skill_mcp` | Invoke skills and skill-embedded MCPs |
| **System** (2) | `interactive_bash`, `look_at` | Tmux terminal, image/file viewing |
| **Editing** (1) | `hashline_edit` | Hash-anchored file editing (conditional) |

### Hash-Anchored Edit Tool (Hashline)

A standout innovation inspired by [oh-my-pi](https://github.com/can1357/oh-my-pi). Every line the agent reads is tagged with a content hash:

```
11#VK| function hello() {
22#XJ|   return "world";
33#MB| }
```

Edits reference these hashes. If the file changed, the hash mismatch rejects the edit before corruption occurs. This reportedly improved edit success rates from **6.7% to 68.3%** on certain benchmarks[^25]. Implementation lives in `src/tools/hashline-edit/`[^26].

---

## Hook System (46 Hooks)

The hook system is organized into a 5-tier composition, each tier handling different lifecycle phases[^27].

### Tier Structure

| Tier | Name | Count | Purpose |
|------|------|-------|---------|
| 1 | Session Hooks | 23 | Session lifecycle, model switching, error recovery |
| 2 | Tool Guard Hooks | 10 | Pre/post-tool validation, output truncation |
| 3 | Transform Hooks | 4 | Message transformation, context injection |
| 4 | Continuation Hooks | 7 | Boulder mechanism, background notifications |
| 5 | Skill Hooks | 2 | Skill reminders, auto-slash commands |

### Notable Hooks

- **`todo-continuation-enforcer`** (13 files, ~2061 LOC) — The "Boulder" mechanism. Forces the agent to continue when todos remain incomplete. 2s countdown toast → continuation injection. Exponential backoff: 30s base, ×2 per failure, max 5 consecutive failures then 5-min pause[^27].
- **`ralph-loop`** (14 files, ~1687 LOC) — Self-referential dev loop. State persisted in `.sisyphus/ralph-loop.local.md`. Detects `<promise>DONE</promise>` in output. Max 100 iterations[^27].
- **`atlas`** (17 files, ~1976 LOC) — Master orchestrator for boulder/background sessions. Decision gates: session type → abort check → failure count → background tasks → agent match → plan completeness → cooldown (5s)[^27].
- **`comment-checker`** — Prevents AI-generated "slop" patterns in code comments (using the `@code-yeongyu/comment-checker` package)[^1].
- **`hashline-read-enhancer`** — Post-processes `Read` tool output to add `LINE#ID` hash tags for the hashline edit system[^27].
- **`runtime-fallback`** — Auto-switches models on API provider errors[^27].
- **`keyword-detector`** (~1665 LOC) — Detects mode keywords from user input: `ultrawork`, `search`, `analyze`, `prove-yourself`. Injects mode-specific system prompts[^27].

---

## Feature Modules (19 Modules)

The `src/features/` directory contains self-contained feature modules, each with own types, implementation, and tests[^28].

### Key Feature Modules

| Module | Files | Purpose |
|--------|-------|---------|
| **background-agent** | 31 files, ~10k LOC | Core orchestration engine. `BackgroundManager` manages task lifecycle (pending→running→completed/error/cancelled). Concurrency: per-model/provider limits via `ConcurrencyManager` (FIFO). Polling: 3s interval[^28] |
| **opencode-skill-loader** | 33 files, ~3.2k LOC | 4-scope skill discovery (project > opencode > user > global). YAML frontmatter parsing from `SKILL.md` files[^28] |
| **tmux-subagent** | 30 files, ~3.6k LOC | State-first tmux integration. Pane lifecycle, grid planning, session orchestration[^28] |
| **mcp-oauth** | 18 files | OAuth 2.0 + PKCE + DCR (RFC 7591) for MCP servers[^28] |
| **builtin-skills** | 17 files | 6 built-in skills: `git-master`, `playwright`, `playwright-cli`, `agent-browser`, `dev-browser`, `frontend-ui-ux`[^28] |
| **skill-mcp-manager** | 12 files | MCP client lifecycle per session (stdio + HTTP)[^28] |
| **claude-code-plugin-loader** | 10 files | Unified plugin discovery from `.opencode/plugins/`[^28] |
| **claude-tasks** | 7 files | Task schema + file storage + OpenCode todo sync[^28] |

### Three-Tier MCP System

| Tier | Source | Mechanism |
|------|--------|-----------|
| Built-in | `src/mcp/` | 3 remote HTTP MCPs: websearch (Exa/Tavily), Context7 (official docs), grep_app (GitHub code search)[^29] |
| Claude Code | `.mcp.json` | `${VAR}` env expansion via claude-code-mcp-loader[^28] |
| Skill-embedded | SKILL.md YAML | Managed by `SkillMcpManager` (stdio + HTTP)[^6] |

---

## Configuration System

### Multi-Level Config Merge

```
Project (.opencode/oh-my-opencode.jsonc)
  → User (~/.config/opencode/oh-my-opencode.jsonc)
    → Defaults (Zod schema)
```

Configuration uses JSONC (comments and trailing commas supported). The merge strategy is nuanced[^5]:
- **`agents`, `categories`, `claude_code`**: Deep-merged recursively
- **`disabled_*` arrays**: Set union (concatenated + deduplicated)
- **All other fields**: Override replaces base value
- **Zod `safeParse()`**: Fills defaults for omitted fields
- **`migrateConfigFile()`**: Transforms legacy keys automatically

The config handler runs a **6-phase pipeline**[^30]:
1. `applyProviderConfig()` — Provider/model setup
2. `loadPluginComponents()` — Plugin discovery
3. `applyAgentConfig()` — Agent registration
4. `applyToolConfig()` — Tool registration
5. `applyMcpConfig()` — MCP server setup
6. `applyCommandConfig()` — Slash command registration

---

## Build & Distribution

### Runtime & Build

- **Runtime**: Bun only (never npm/yarn)[^2]
- **Build**: `bun build` (ESM) + `tsc --emitDeclarationOnly`, externals: `@ast-grep/napi`[^1]
- **TypeScript**: Strict mode, ESNext, bundler moduleResolution, `bun-types`[^2]
- **Testing**: Bun test (`bun:test`), co-located `*.test.ts`, given/when/then style[^2]

### Platform Binaries

The `packages/` directory contains 11 platform-specific binary packages for cross-platform distribution[^31]:
- `darwin-arm64`, `darwin-x64`, `darwin-x64-baseline`
- `linux-arm64`, `linux-arm64-musl`, `linux-x64`, `linux-x64-baseline`, `linux-x64-musl`, `linux-x64-musl-baseline`
- `windows-x64`, `windows-x64-baseline`

### CI/CD

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | push/PR to master/dev | Tests (split: mock-heavy isolated + batch), typecheck, build, schema auto-commit |
| `publish.yml` | manual dispatch | Version bump, npm publish, platform binaries, GitHub release, merge to master |
| `publish-platform.yml` | called by publish | 12 platform binaries via bun compile |
| `sisyphus-agent.yml` | @mention / dispatch | AI agent handles issues/PRs automatically |
| `cla.yml` | issue_comment/PR | CLA assistant for contributors[^32] |

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `@opencode-ai/plugin` ^1.2.24 | OpenCode plugin SDK |
| `@opencode-ai/sdk` ^1.2.24 | OpenCode SDK (client APIs) |
| `@ast-grep/napi` ^0.41.1 | AST-aware code search/replace (native) |
| `@modelcontextprotocol/sdk` ^1.25.2 | MCP protocol implementation |
| `@code-yeongyu/comment-checker` ^0.7.0 | AI slop detection in code comments |
| `zod` ^4.1.8 | Schema validation (Zod v4) |
| `commander` ^14.0.2 | CLI framework |
| `vscode-jsonrpc` ^8.2.0 | LSP communication protocol |
| `diff` ^8.0.3 | Diff generation for edits |

---

## Coding Conventions & Anti-Patterns

The project enforces strict conventions[^2]:

**Required patterns:**
- Factory pattern: `createXXX()` for all tools, hooks, agents
- kebab-case file naming
- `index.ts` barrel exports (98 barrel files establish module boundaries)
- Relative imports only (no `@/` path aliases)
- 200 LOC soft limit per file
- given/when/then test style with nested describe (`#given`/`#when`/`#then` prefixes)

**Banned patterns:**
- `as any`, `@ts-ignore`, `@ts-expect-error`
- Catch-all files (`utils.ts`, `helpers.ts`)
- Empty catch blocks
- Em dashes, en dashes, AI filler phrases in generated content
- Direct `bun publish` (must use GitHub Actions)

---

## Licensing

Licensed under the **Sustainable Use License (SUL-1.0)**[^3], which permits:
- Use, copy, distribute for **internal business** or **non-commercial/personal** use
- Free distribution for non-commercial purposes
- Derivative works subject to the same limitations

Restrictions:
- **Cannot be sold** or distributed commercially
- Cannot obscure licensing notices
- Patent claims terminate if infringement alleged

---

## Community & Ecosystem

- **Author**: YeonGyu-Kim (@code-yeongyu)[^1]
- **Company**: Sisyphus Labs (building a productized version)[^33]
- **Discord**: Active community at [discord.gg/PUwSMR9XNk](https://discord.gg/PUwSMR9XNk)
- **Documentation**: Multi-language READMEs (English, Korean, Japanese, Chinese, Russian)
- **DeepWiki**: Available at [deepwiki.com/code-yeongyu/oh-my-openagent](https://deepwiki.com/code-yeongyu/oh-my-openagent)
- **CLA**: Contributors must sign a CLA (enforced by GitHub Action)[^32]
- **Used by**: Professionals at Indent, Google, Microsoft, ELESTYLE (per README claims)[^33]

The project is very actively maintained — the most recent commits are from today (March 17, 2026), with features like smart circuit breakers for background agents and hashline edit improvements being actively developed[^32].

---

## Key Repositories Summary

| Repository | Purpose | Key Files |
|------------|---------|-----------|
| [code-yeongyu/oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) | Main plugin repository | `src/index.ts`, `src/agents/`, `src/tools/`, `src/hooks/` |
| npm: `oh-my-opencode` | Published npm package | Distributed as ESM + platform binaries |
| [can1357/oh-my-pi](https://github.com/can1357/oh-my-pi) | Inspiration for hashline edit system | Referenced in README |

---

## Confidence Assessment

| Aspect | Confidence | Notes |
|--------|------------|-------|
| Architecture & initialization flow | **High** | Verified from source code (`src/index.ts`, factory files) |
| Agent catalog & roles | **High** | Verified from `builtin-agents.ts`, `types.ts`, README |
| Tool catalog (26 tools) | **High** | Verified from `src/tools/AGENTS.md` and directory structure |
| Hook system (46 hooks) | **High** | Verified from `src/hooks/AGENTS.md` and `create-hooks.ts` |
| Category-to-model mapping | **High** | Verified from `src/tools/AGENTS.md` delegation categories |
| Performance claims (6.7%→68.3%) | **Medium** | Claimed in README; no benchmark code in accessible repo |
| "Used by Google/Microsoft" claims | **Low** | Self-reported in README; no independent verification |
| Background concurrency limits (5/model) | **High** | Stated in AGENTS.md and feature module docs |
| License terms | **High** | Directly from `LICENSE.md` |

**Assumptions made:**
- The project structure and file contents reflect the `dev` branch HEAD (commit `d808338`)
- Model names like `gpt-5.3-codex` and `gpt-5.4` are genuine references to models available in March 2026
- The "Sustainable Use License" is a bespoke license, not a widely-recognized standard

---

## Footnotes

[^1]: `package.json` — npm package metadata, dependencies, and scripts (SHA: `952fdbcf`)
[^2]: `AGENTS.md` (root) — Project overview, conventions, anti-patterns (SHA: `f0f44cda`)
[^3]: `LICENSE.md` — Sustainable Use License v1.0 (SHA: `5982a872`)
[^4]: `src/index.ts` — Plugin entry point, initialization flow (SHA: `70156f10`)
[^5]: `src/plugin-config.ts` — JSONC config loading, multi-level merge, partial parsing (SHA: `c9f93f10`)
[^6]: `src/create-managers.ts` — Manager instantiation (Tmux, Background, SkillMcp, Config) (SHA: `0aefd0e2`)
[^7]: `src/create-tools.ts` — Skill context creation, category building, tool registry (SHA: `880e0a42`)
[^8]: `src/create-hooks.ts` — Three-tier hook composition (Core + Continuation + Skill) (SHA: `e49f08c9`)
[^9]: `src/plugin-interface.ts` — 8 OpenCode hook handler mapping (SHA: `0cff2ee7`)
[^10]: `src/agents/types.ts` — Agent type definitions (AgentMode, AgentFactory, AgentPromptMetadata) (SHA: `acf49000`)
[^11]: `src/agents/builtin-agents.ts` — Agent registry, `createBuiltinAgents()`, model resolution (SHA: `350d69e5`)
[^12]: `src/agents/sisyphus.ts` — Sisyphus orchestrator agent (21,705 bytes)
[^13]: `src/agents/hephaestus/` — Hephaestus deep worker agent
[^14]: `src/agents/prometheus/` — Prometheus strategic planner agent
[^15]: `src/agents/oracle.ts` — Oracle architecture/debugging agent (14,731 bytes)
[^16]: `src/agents/librarian.ts` — Librarian documentation agent (11,825 bytes)
[^17]: `src/agents/explore.ts` — Explore fast search agent (3,926 bytes)
[^18]: `src/agents/metis.ts` — Metis plan consultant (13,045 bytes)
[^19]: `src/agents/momus.ts` — Momus code critic (14,387 bytes)
[^20]: `src/agents/atlas/` — Atlas alternate orchestrator
[^21]: `src/agents/multimodal-looker.ts` — Multimodal image analysis agent (2,280 bytes)
[^22]: `src/agents/sisyphus-junior/` — Lightweight utility runner
[^23]: `src/agents/dynamic-agent-prompt-builder.ts` — Dynamic Sisyphus prompt construction (19,288 bytes)
[^24]: `src/tools/AGENTS.md` — Complete tool catalog with parameters and categories (SHA: `d7b0e840`)
[^25]: README.md — Hashline edit success rate improvement claims
[^26]: `src/tools/hashline-edit/` — Hash-anchored edit tool implementation
[^27]: `src/hooks/AGENTS.md` — Complete hook catalog, tier structure, key hook details (SHA: `4a25ccb4`)
[^28]: `src/features/AGENTS.md` — Feature module catalog with file counts and complexity (SHA: `f0f6a51e`)
[^29]: `src/mcp/` — Built-in MCP servers (context7.ts, websearch.ts, grep-app.ts)
[^30]: `src/plugin-handlers/config-handler.ts` — 6-phase config pipeline (SHA: `47050300`)
[^31]: `packages/` — 11 platform-specific binary packages (darwin, linux, windows)
[^32]: Recent commit history (HEAD at `d808338`, 2026-03-17) — Active development with CLA, circuit breakers, hashline improvements
[^33]: README.md — Community claims, Sisyphus Labs mention, company usage
