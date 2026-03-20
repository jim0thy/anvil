---
name: dev-browser
description: Browser automation with persistent page state. Use when users ask to navigate websites, fill forms, take screenshots, extract web data, test web apps, or automate browser workflows. Trigger phrases include "go to [url]", "click on", "fill out the form", "take a screenshot", "scrape", "automate", "test the website", "log into", or any browser interaction request.
---

# Dev Browser Skill

Browser automation that maintains page state across script executions. Write small, focused scripts to accomplish tasks incrementally. Once you've proven out part of a workflow and there is repeated work to be done, you can write a script to do the repeated work in a single execution.

## Choosing Your Approach

- **Local/source-available sites**: Read the source code first to write selectors directly
- **Unknown page layouts**: Use `getAISnapshot()` to discover elements and `selectSnapshotRef()` to interact with them
- **Visual feedback**: Take screenshots to see what the user sees

## Setup

> **Installation**: See the [Installation Guide](#installation-guide) section below for detailed setup instructions including Windows support.

Two modes available. Ask the user if unclear which to use.

### Standalone Mode (Default)

Launches a new Chromium browser for fresh automation sessions.

```bash
./skills/dev-browser/server.sh &
```

Add `--headless` flag if user requests it. **Wait for the `Ready` message before running scripts.**

### Extension Mode

Connects to user's existing Chrome browser. Use this when:

- The user is already logged into sites and wants you to do things behind an authed experience that isn't local dev.
- The user asks you to use the extension

**Important**: The core flow is still the same. You create named pages inside of their browser.

**Start the relay server:**

```bash
cd skills/dev-browser && npm i && npm run start-extension &
```

Wait for `Waiting for extension to connect...` followed by `Extension connected` in the console. To know that a client has connected and the browser is ready to be controlled.
**Workflow:**

1. Scripts call `client.page("name")` just like the normal mode to create new pages / connect to existing ones.
2. Automation runs on the user's actual browser session

If the extension hasn't connected yet, tell the user to launch and activate it. Download link: https://github.com/SawyerHood/dev-browser/releases

## Writing Scripts

> **Run all scripts from `skills/dev-browser/` directory.** The `@/` import alias requires this directory's config.

Execute scripts inline using heredocs:

```bash
cd skills/dev-browser && npx tsx <<'EOF'
import { connect, waitForPageLoad } from "@/client.js";

const client = await connect();
// Create page with custom viewport size (optional)
const page = await client.page("example", { viewport: { width: 1920, height: 1080 } });

await page.goto("https://example.com");
await waitForPageLoad(page);

console.log({ title: await page.title(), url: page.url() });
await client.disconnect();
EOF
```

**Write to `tmp/` files only when** the script needs reuse, is complex, or user explicitly requests it.

### Key Principles

1. **Small scripts**: Each script does ONE thing (navigate, click, fill, check)
2. **Evaluate state**: Log/return state at the end to decide next steps
3. **Descriptive page names**: Use `"checkout"`, `"login"`, not `"main"`
4. **Disconnect to exit**: `await client.disconnect()` - pages persist on server
5. **Plain JS in evaluate**: `page.evaluate()` runs in browser - no TypeScript syntax

## Workflow Loop

Follow this pattern for complex tasks:

1. **Write a script** to perform one action
2. **Run it** and observe the output
3. **Evaluate** - did it work? What's the current state?
4. **Decide** - is the task complete or do we need another script?
5. **Repeat** until task is done

### No TypeScript in Browser Context

Code passed to `page.evaluate()` runs in the browser, which doesn't understand TypeScript:

```typescript
// ✅ Correct: plain JavaScript
const text = await page.evaluate(() => {
  return document.body.innerText;
});

// ❌ Wrong: TypeScript syntax will fail at runtime
const text = await page.evaluate(() => {
  const el: HTMLElement = document.body; // Type annotation breaks in browser!
  return el.innerText;
});
```

## Scraping Data

For scraping large datasets, intercept and replay network requests rather than scrolling the DOM. See the [Data Scraping Guide](#data-scraping-guide) section below for the complete guide covering request capture, schema discovery, and paginated API replay.

## Client API

```typescript
const client = await connect();

// Get or create named page (viewport only applies to new pages)
const page = await client.page("name");
const pageWithSize = await client.page("name", { viewport: { width: 1920, height: 1080 } });

const pages = await client.list(); // List all page names
await client.close("name"); // Close a page
await client.disconnect(); // Disconnect (pages persist)

// ARIA Snapshot methods
const snapshot = await client.getAISnapshot("name"); // Get accessibility tree
const element = await client.selectSnapshotRef("name", "e5"); // Get element by ref
```

The `page` object is a standard Playwright Page.

## Waiting

```typescript
import { waitForPageLoad } from "@/client.js";

await waitForPageLoad(page); // After navigation
await page.waitForSelector(".results"); // For specific elements
await page.waitForURL("**/success"); // For specific URL
```

## Inspecting Page State

### Screenshots

```typescript
await page.screenshot({ path: "tmp/screenshot.png" });
await page.screenshot({ path: "tmp/full.png", fullPage: true });
```

### ARIA Snapshot (Element Discovery)

Use `getAISnapshot()` to discover page elements. Returns YAML-formatted accessibility tree:

```yaml
- banner:
  - link "Hacker News" [ref=e1]
  - navigation:
    - link "new" [ref=e2]
- main:
  - list:
    - listitem:
      - link "Article Title" [ref=e8]
      - link "328 comments" [ref=e9]
- contentinfo:
  - textbox [ref=e10]
    - /placeholder: "Search"
```

**Interpreting refs:**

- `[ref=eN]` - Element reference for interaction (visible, clickable elements only)
- `[checked]`, `[disabled]`, `[expanded]` - Element states
- `[level=N]` - Heading level
- `/url:`, `/placeholder:` - Element properties

**Interacting with refs:**

```typescript
const snapshot = await client.getAISnapshot("hackernews");
console.log(snapshot); // Find the ref you need

const element = await client.selectSnapshotRef("hackernews", "e2");
await element.click();
```

## Error Recovery

Page state persists after failures. Debug with:

```bash
cd skills/dev-browser && npx tsx <<'EOF'
import { connect } from "@/client.js";

const client = await connect();
const page = await client.page("hackernews");

await page.screenshot({ path: "tmp/debug.png" });
console.log({
  url: page.url(),
  title: await page.title(),
  bodyText: await page.textContent("body").then((t) => t?.slice(0, 200)),
});

await client.disconnect();
EOF
```

---

# Installation Guide

This guide covers installation for all platforms: macOS, Linux, and Windows.

## Prerequisites

- [Node.js](https://nodejs.org) v18 or later with npm
- Git (for cloning the skill)

## Installation

### Step 1: Clone the Skill

```bash
# Clone dev-browser to a temporary location
git clone https://github.com/sawyerhood/dev-browser /tmp/dev-browser-skill

# Copy to skills directory (adjust path as needed)
mkdir -p skills/dev-browser
cp -r /tmp/dev-browser-skill/skills/dev-browser/* skills/dev-browser/

# Cleanup
rm -rf /tmp/dev-browser-skill
```

**Windows (PowerShell):**
```powershell
# Clone dev-browser to temp location
git clone https://github.com/sawyerhood/dev-browser $env:TEMP\dev-browser-skill

# Copy to skills directory
New-Item -ItemType Directory -Force -Path "skills\dev-browser"
Copy-Item -Recurse "$env:TEMP\dev-browser-skill\skills\dev-browser\*" "skills\dev-browser\"

# Cleanup
Remove-Item -Recurse -Force "$env:TEMP\dev-browser-skill"
```

### Step 2: Install Dependencies

```bash
cd skills/dev-browser
npm install
```

**Windows (PowerShell):**
```powershell
cd skills\dev-browser
npm install
```

### Step 3: Start the Server

#### Standalone Mode (New Browser Instance)

**macOS/Linux:**
```bash
cd skills/dev-browser
./server.sh &
# Or for headless:
./server.sh --headless &
```

**Windows (PowerShell):**
```powershell
cd skills\dev-browser
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "server.js"
# Or for headless:
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "server.js", "--headless"
```

**Windows (CMD):**
```cmd
cd skills\dev-browser
start /B node server.js
```

Wait for the `Ready` message before running scripts.

#### Extension Mode (Use Existing Chrome)

**macOS/Linux:**
```bash
cd skills/dev-browser
npm run start-extension &
```

**Windows (PowerShell):**
```powershell
cd skills\dev-browser
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "start-extension"
```

Wait for `Extension connected` message.

## Chrome Extension Setup (Optional)

The Chrome extension allows controlling your existing Chrome browser with all your logged-in sessions.

### Installation

1. Download `extension.zip` from [latest release](https://github.com/sawyerhood/dev-browser/releases/latest)
2. Extract to a permanent location:
   - **macOS/Linux:** `~/.dev-browser-extension`
   - **Windows:** `%USERPROFILE%\.dev-browser-extension`
3. Open Chrome → `chrome://extensions`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked" → select the extracted folder

### Usage

1. Click the Dev Browser extension icon in Chrome toolbar
2. Toggle to "Active"
3. Start the extension relay server (see above)
4. Use dev-browser scripts - they'll control your existing Chrome

## Troubleshooting

### Server Won't Start

**Check Node.js version:**
```bash
node --version  # Should be v18+
```

**Check port availability:**
```bash
# macOS/Linux
lsof -i :3000

# Windows
netstat -ano | findstr :3000
```

### Playwright Installation Issues

If Chromium fails to install:
```bash
npx playwright install chromium
```

### Windows-Specific Issues

**Execution Policy:**
If PowerShell scripts are blocked:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Path Issues:**
Use forward slashes or escaped backslashes in paths:
```powershell
# Good
cd "skills/dev-browser"
# Also good
cd "skills\dev-browser"
```

### Extension Not Connecting

1. Ensure extension is "Active" (click icon to toggle)
2. Check relay server is running (`npm run start-extension`)
3. Look for `Extension connected` message in console
4. Try reloading the extension in `chrome://extensions`

## Updating

```bash
cd skills/dev-browser
git pull
npm install
```

**Windows:**
```powershell
cd skills\dev-browser
git pull
npm install
```

---

# Data Scraping Guide

For large datasets (followers, posts, search results), **intercept and replay network requests** rather than scrolling and parsing the DOM. This is faster, more reliable, and handles pagination automatically.

## Why Not Scroll?

Scrolling is slow, unreliable, and wastes time. APIs return structured data with pagination built in. Always prefer API replay.

## Start Small, Then Scale

**Don't try to automate everything at once.** Work incrementally:

1. **Capture one request** - verify you're intercepting the right endpoint
2. **Inspect one response** - understand the schema before writing extraction code
3. **Extract a few items** - make sure your parsing logic works
4. **Then scale up** - add pagination loop only after the basics work

This prevents wasting time debugging a complex script when the issue is a simple path like `data.user.timeline` vs `data.user.result.timeline`.

## Step-by-Step Workflow

### 1. Capture Request Details

First, intercept a request to understand URL structure and required headers:

```typescript
import { connect, waitForPageLoad } from "@/client.js";
import * as fs from "node:fs";

const client = await connect();
const page = await client.page("site");

let capturedRequest = null;
page.on("request", (request) => {
  const url = request.url();
  // Look for API endpoints (adjust pattern for your target site)
  if (url.includes("/api/") || url.includes("/graphql/")) {
    capturedRequest = {
      url: url,
      headers: request.headers(),
      method: request.method(),
    };
    fs.writeFileSync("tmp/request-details.json", JSON.stringify(capturedRequest, null, 2));
    console.log("Captured request:", url.substring(0, 80) + "...");
  }
});

await page.goto("https://example.com/profile");
await waitForPageLoad(page);
await page.waitForTimeout(3000);

await client.disconnect();
```

### 2. Capture Response to Understand Schema

Save a raw response to inspect the data structure:

```typescript
page.on("response", async (response) => {
  const url = response.url();
  if (url.includes("UserTweets") || url.includes("/api/data")) {
    const json = await response.json();
    fs.writeFileSync("tmp/api-response.json", JSON.stringify(json, null, 2));
    console.log("Captured response");
  }
});
```

Then analyze the structure to find:

- Where the data array lives (e.g., `data.user.result.timeline.instructions[].entries`)
- Where pagination cursors are (e.g., `cursor-bottom` entries)
- What fields you need to extract

### 3. Replay API with Pagination

Once you understand the schema, replay requests directly:

```typescript
import { connect } from "@/client.js";
import * as fs from "node:fs";

const client = await connect();
const page = await client.page("site");

const results = new Map(); // Use Map for deduplication
const headers = JSON.parse(fs.readFileSync("tmp/request-details.json", "utf8")).headers;
const baseUrl = "https://example.com/api/data";

let cursor = null;
let hasMore = true;

while (hasMore) {
  // Build URL with pagination cursor
  const params = { count: 20 };
  if (cursor) params.cursor = cursor;
  const url = `${baseUrl}?params=${encodeURIComponent(JSON.stringify(params))}`;

  // Execute fetch in browser context (has auth cookies/headers)
  const response = await page.evaluate(
    async ({ url, headers }) => {
      const res = await fetch(url, { headers });
      return res.json();
    },
    { url, headers }
  );

  // Extract data and cursor (adjust paths for your API)
  const entries = response?.data?.entries || [];
  for (const entry of entries) {
    if (entry.type === "cursor-bottom") {
      cursor = entry.value;
    } else if (entry.id && !results.has(entry.id)) {
      results.set(entry.id, {
        id: entry.id,
        text: entry.content,
        timestamp: entry.created_at,
      });
    }
  }

  console.log(`Fetched page, total: ${results.size}`);

  // Check stop conditions
  if (!cursor || entries.length === 0) hasMore = false;

  // Rate limiting - be respectful
  await new Promise((r) => setTimeout(r, 500));
}

// Export results
const data = Array.from(results.values());
fs.writeFileSync("tmp/results.json", JSON.stringify(data, null, 2));
console.log(`Saved ${data.length} items`);

await client.disconnect();
```

## Key Patterns

| Pattern                 | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| `page.on('request')`    | Capture outgoing request URL + headers                 |
| `page.on('response')`   | Capture response data to understand schema             |
| `page.evaluate(fetch)`  | Replay requests in browser context (inherits auth)     |
| `Map` for deduplication | APIs often return overlapping data across pages        |
| Cursor-based pagination | Look for `cursor`, `next_token`, `offset` in responses |

## Tips

- **Extension mode**: `page.context().cookies()` doesn't work - capture auth headers from intercepted requests instead
- **Rate limiting**: Add 500ms+ delays between requests to avoid blocks
- **Stop conditions**: Check for empty results, missing cursor, or reaching a date/ID threshold
- **GraphQL APIs**: URL params often include `variables` and `features` JSON objects - capture and reuse them
