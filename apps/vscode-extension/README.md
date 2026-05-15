# 🔌 AI DevOps — VS Code Extension

Bring AI-powered code review directly into your editor. Inline risk annotations, real-time risk score, and one-click dashboard access.

## Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Review** | Send file or selection to GPT-4o/Claude for review |
| 🔴 **Inline Diagnostics** | Squiggly underlines on risky lines |
| 📊 **Status Bar Score** | Live risk score badge in the status bar |
| 💾 **Auto-review on Save** | Optional automatic review whenever you save |
| 🔗 **Dashboard Link** | Open the SaaS dashboard from command palette |

---

## Installation

### From Source (Development)

```bash
cd apps/vscode-extension
powershell -ExecutionPolicy Bypass -Command "pnpm compile"
```

Then press **F5** in VS Code to launch an Extension Development Host.

### From VSIX (Production)

```bash
powershell -ExecutionPolicy Bypass -Command "pnpm package"
# Install the generated .vsix file via:
# VS Code → Extensions → ⋯ → Install from VSIX
```

---

## Commands

Access via **Command Palette** (`Ctrl+Shift+P`):

| Command | Shortcut | Description |
|---------|----------|-------------|
| `AI DevOps: Review Current File` | — | AI review of entire open file |
| `AI DevOps: Review Selection` | — | AI review of selected code only |
| `AI DevOps: Open Dashboard` | — | Opens web dashboard in browser |
| `AI DevOps: Configure Settings` | — | Opens VS Code settings for the extension |

Right-click context menu also exposes **Review Current File** and **Review Selection**.

---

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aidevops.apiUrl` | string | `http://localhost:3001` | AI DevOps API endpoint |
| `aidevops.apiToken` | string | `""` | JWT authentication token |
| `aidevops.riskThreshold` | number | `70` | Score (0–100) above which an error is shown |
| `aidevops.autoReviewOnSave` | boolean | `false` | Auto-trigger review on file save |
| `aidevops.showInlineAnnotations` | boolean | `true` | Show squiggly annotations on issues |

Edit in `settings.json`:

```json
{
  "aidevops.apiUrl": "https://your-api.aidevops.io",
  "aidevops.apiToken": "eyJhbGciOi...",
  "aidevops.riskThreshold": 60,
  "aidevops.autoReviewOnSave": true
}
```

---

## Status Bar

The status bar item (right side) shows:

| State | Display |
|-------|---------|
| Idle | `🤖 AI Review` |
| Reviewing | `⟳ AI Reviewing...` |
| Low risk (< 40) | `✔ Risk: 23/100` |
| Medium risk (40–69) | `⚠ Risk: 55/100` (yellow background) |
| High risk (≥ 70) | `✖ Risk: 82/100` (red background) |
| Error | `✖ AI Review Failed` |

---

## Supported Languages

`.ts` `.tsx` `.js` `.jsx` `.py` `.go` `.java` `.cs` `.rb` `.php`

---

## Development

```bash
# Watch mode
powershell -ExecutionPolicy Bypass -Command "pnpm watch"

# Run tests
powershell -ExecutionPolicy Bypass -Command "pnpm test"

# Package as VSIX
powershell -ExecutionPolicy Bypass -Command "pnpm package"
```

### Project Structure

```
apps/vscode-extension/
├── src/
│   └── extension.ts    # Main extension code
├── package.json         # Extension manifest (contributes, commands, config)
├── tsconfig.json        # TypeScript configuration
└── dist/               # Compiled output (after build)
```
