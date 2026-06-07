# Playwright MCP — Quick-Start Guide

> **What is this?**  
> [Playwright MCP](https://github.com/microsoft/playwright-mcp) adds a Model Context Protocol (MCP) server on top of Playwright, enabling AI agents to control a real browser using structured accessibility snapshots — no screenshots or vision models needed.

---

## How it Relates to the Existing E2E Suite

| | `@playwright/test` (existing) | `@playwright/mcp` (new) |
|---|---|---|
| **Purpose** | Human-written deterministic specs | AI-driven interactive/exploratory automation |
| **Run by** | `pnpm test:e2e` | MCP client (IDE agent) or `pnpm mcp:playwright` |
| **Output** | HTML report + JSON + screenshots | Accessibility snapshots + session recordings |
| **Browser** | Chromium (headless-compatible) | Chrome (headed by default) |
| **Good for** | CI regression checks | Generating new specs, self-healing tests, debugging |

Both can run simultaneously — they don't conflict.

---

## Setup

Dependencies are already installed. The MCP server is available via `npx`:

```bash
# From monorepo root — starts MCP server on port 8931
pnpm mcp:playwright

# From apps/web — alternative shortcut
pnpm test:e2e:mcp
```

---

## IDE Integration (Antigravity)

The Playwright MCP server is registered in the Antigravity IDE MCP config (`mcp_config.json`). After restarting the IDE, the following tools become available in the AI chat:

- `browser_navigate` — navigate to any URL
- `browser_click` — click elements by accessibility reference
- `browser_snapshot` — get the full accessibility tree of the current page
- `browser_take_screenshot` — capture a screenshot
- `browser_type` — type text into inputs
- `browser_wait_for` — wait for text/elements to appear
- and many more

### Example: Have the AI navigate and inspect your dashboard

Just ask in the chat:
> *"Navigate to http://localhost:3000/dashboard and show me the accessibility snapshot"*

---

## Standalone HTTP Server (for CI or remote agents)

Run the MCP server as a persistent HTTP service instead of letting the IDE spawn it per-session:

```bash
# Start on port 8931 (headless for CI)
npx @playwright/mcp@latest --port 8931 --headless --browser chromium --no-sandbox

# Then configure your MCP client to point at:
# http://localhost:8931/mcp
```

Example client config for remote connection:
```json
{
  "mcpServers": {
    "playwright": {
      "url": "http://localhost:8931/mcp"
    }
  }
}
```

---

## Isolated Mode (Clean Sessions)

For clean-slate test sessions (no persisted login state), use `--isolated`:

```bash
npx @playwright/mcp@latest --isolated --storage-state=./e2e-results/storage-state.json
```

This is useful for:
- Testing the login/auth flow from scratch
- Parallel CI runs without profile conflicts

---

## Session Output

MCP sessions are saved to:
```
apps/web/e2e-results/mcp-sessions/
```

This directory is gitignored. Sessions include:
- Accessibility snapshots per action
- Console logs
- Network request logs

---

## Running Existing E2E Tests

The standard Playwright test suite is unaffected:

```bash
# From apps/web
pnpm test:e2e              # headless, all specs
pnpm test:e2e:ui           # Playwright UI mode (visual debugging)
pnpm test:e2e:report       # Open last HTML report
```

---

## Project-Level MCP Config

The `.mcp.json` at the monorepo root is a team-shareable MCP server definition. MCP-compatible clients (Claude Desktop, Cursor, etc.) will auto-detect it when opening this workspace.
