import * as vscode from 'vscode';
import axios from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RiskScore {
  overall: number;
  security: number;
  quality: number;
  performance: number;
  level: 'critical' | 'high' | 'medium' | 'low' | 'info';
  summary: string;
}

interface CodeIssue {
  file: string;
  line: number;
  riskLevel: string;
  category: string;
  title: string;
  description: string;
  suggestion: string;
}

interface AIReviewResult {
  riskScore: RiskScore;
  issues: CodeIssue[];
  summary: string;
  approved: boolean;
  blockedReason?: string;
}

// ─── Globals ──────────────────────────────────────────────────────────────────

let statusBarItem: vscode.StatusBarItem;
let diagnosticCollection: vscode.DiagnosticCollection;
let outputChannel: vscode.OutputChannel;

const RISK_COLORS = {
  critical: new vscode.ThemeColor('charts.red'),
  high: new vscode.ThemeColor('charts.orange'),
  medium: new vscode.ThemeColor('charts.yellow'),
  low: new vscode.ThemeColor('charts.green'),
  info: new vscode.ThemeColor('charts.blue'),
};

// ─── Extension Entry Point ────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('AI DevOps');
  diagnosticCollection = vscode.languages.createDiagnosticCollection('aidevops');
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(robot) AI Review';
  statusBarItem.tooltip = 'Click to run AI code review';
  statusBarItem.command = 'aidevops.reviewFile';
  statusBarItem.show();

  outputChannel.appendLine('🤖 AI DevOps Extension activated');

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('aidevops.reviewFile', reviewCurrentFile),
    vscode.commands.registerCommand('aidevops.reviewSelection', reviewSelection),
    vscode.commands.registerCommand('aidevops.openDashboard', openDashboard),
    vscode.commands.registerCommand('aidevops.configure', openSettings),
    diagnosticCollection,
    statusBarItem,
    outputChannel,
  );

  // Auto-review on save (if enabled)
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (doc) => {
      const config = getConfig();
      if (config.autoReviewOnSave && isSupportedFile(doc.fileName)) {
        await reviewDocument(doc);
      }
    }),
  );

  // Clear diagnostics when file closes
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) => {
      diagnosticCollection.delete(doc.uri);
    }),
  );
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function reviewCurrentFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('AI DevOps: No active file to review');
    return;
  }
  await reviewDocument(editor.document);
}

async function reviewSelection() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    vscode.window.showWarningMessage('AI DevOps: No text selected');
    return;
  }
  const code = editor.document.getText(editor.selection);
  const filename = editor.document.fileName;
  await runReview(code, filename);
}

function openDashboard() {
  const config = getConfig();
  vscode.env.openExternal(vscode.Uri.parse(config.apiUrl.replace('3001', '3000')));
}

function openSettings() {
  vscode.commands.executeCommand('workbench.action.openSettings', 'aidevops');
}

// ─── Core Review Logic ────────────────────────────────────────────────────────

async function reviewDocument(doc: vscode.TextDocument) {
  const code = doc.getText();
  const filename = doc.fileName;
  await runReview(code, filename, doc.uri);
}

async function runReview(code: string, filename: string, uri?: vscode.Uri) {
  const config = getConfig();

  setStatusLoading();
  outputChannel.appendLine(`\n📋 Reviewing: ${filename}`);

  try {
    const response = await axios.post<AIReviewResult>(
      `${config.apiUrl}/api/v1/ai-review/inline`,
      { code: code.slice(0, 10000), filename },
      {
        headers: { Authorization: `Bearer ${config.apiToken}`, 'Content-Type': 'application/json' },
        timeout: 60000,
      },
    );

    const result = response.data;
    updateStatusBar(result.riskScore);

    if (uri && config.showInlineAnnotations) {
      applyDiagnostics(uri, result.issues);
    }

    showResultPanel(result, filename);
    logResult(result);
  } catch (err) {
    handleReviewError(err);
  }
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function setStatusLoading() {
  statusBarItem.text = '$(loading~spin) AI Reviewing...';
  statusBarItem.tooltip = 'AI DevOps is analyzing your code...';
}

function updateStatusBar(riskScore: RiskScore) {
  const icons: Record<string, string> = {
    critical: '$(error)', high: '$(warning)', medium: '$(info)',
    low: '$(check)', info: '$(robot)',
  };
  const icon = icons[riskScore.level] ?? '$(robot)';
  statusBarItem.text = `${icon} Risk: ${riskScore.overall}/100`;
  statusBarItem.tooltip = `AI Risk Score: ${riskScore.overall}/100\n${riskScore.summary}`;
  statusBarItem.backgroundColor = riskScore.overall >= 70
    ? new vscode.ThemeColor('statusBarItem.errorBackground')
    : riskScore.overall >= 40
      ? new vscode.ThemeColor('statusBarItem.warningBackground')
      : undefined;
}

function applyDiagnostics(uri: vscode.Uri, issues: CodeIssue[]) {
  const diagnostics: vscode.Diagnostic[] = issues.map((issue) => {
    const line = Math.max(0, issue.line - 1);
    const range = new vscode.Range(line, 0, line, 200);
    const severity = {
      critical: vscode.DiagnosticSeverity.Error,
      high: vscode.DiagnosticSeverity.Error,
      medium: vscode.DiagnosticSeverity.Warning,
      low: vscode.DiagnosticSeverity.Information,
      info: vscode.DiagnosticSeverity.Hint,
    }[issue.riskLevel] ?? vscode.DiagnosticSeverity.Warning;

    const diag = new vscode.Diagnostic(range, `[AI Review] ${issue.title}: ${issue.description}`, severity);
    diag.source = 'AI DevOps';
    diag.code = { value: issue.category, target: vscode.Uri.parse('https://aidevops.io/docs') };
    return diag;
  });

  diagnosticCollection.set(uri, diagnostics);
}

function showResultPanel(result: AIReviewResult, filename: string) {
  const short = filename.split(/[\\/]/).pop() ?? filename;
  const icon = result.approved ? '✅' : '🚫';
  const msg = `${icon} AI Review — ${short}: Risk ${result.riskScore.overall}/100 (${result.riskScore.level.toUpperCase()})`;

  if (!result.approved) {
    vscode.window.showErrorMessage(msg, 'View Details', 'Open Dashboard').then((action) => {
      if (action === 'View Details') showOutputPanel(result);
      if (action === 'Open Dashboard') openDashboard();
    });
  } else if (result.riskScore.overall >= 40) {
    vscode.window.showWarningMessage(msg, 'View Details').then((a) => {
      if (a) showOutputPanel(result);
    });
  } else {
    vscode.window.showInformationMessage(msg);
  }
}

function showOutputPanel(result: AIReviewResult) {
  outputChannel.show();
}

function logResult(result: AIReviewResult) {
  outputChannel.appendLine(`  Risk Score: ${result.riskScore.overall}/100 (${result.riskScore.level})`);
  outputChannel.appendLine(`  Summary: ${result.riskScore.summary}`);
  outputChannel.appendLine(`  Issues: ${result.issues.length}`);
  result.issues.slice(0, 5).forEach((issue) => {
    outputChannel.appendLine(`    [${issue.riskLevel.toUpperCase()}] L${issue.line}: ${issue.title}`);
    outputChannel.appendLine(`      → ${issue.suggestion}`);
  });
  outputChannel.appendLine(`  Decision: ${result.approved ? 'APPROVED ✅' : `BLOCKED 🚫 — ${result.blockedReason}`}`);
}

function handleReviewError(err: unknown) {
  statusBarItem.text = '$(error) AI Review Failed';
  statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');

  const msg = err instanceof Error ? err.message : 'Unknown error';
  outputChannel.appendLine(`  ❌ Review failed: ${msg}`);

  if (msg.includes('ECONNREFUSED')) {
    vscode.window.showErrorMessage('AI DevOps: Cannot connect to API server. Check your API URL in settings.', 'Open Settings').then((a) => {
      if (a) openSettings();
    });
  } else {
    vscode.window.showErrorMessage(`AI DevOps Review Error: ${msg}`);
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function getConfig() {
  const cfg = vscode.workspace.getConfiguration('aidevops');
  return {
    apiUrl: cfg.get<string>('apiUrl', 'http://localhost:3001'),
    apiToken: cfg.get<string>('apiToken', ''),
    riskThreshold: cfg.get<number>('riskThreshold', 70),
    autoReviewOnSave: cfg.get<boolean>('autoReviewOnSave', false),
    showInlineAnnotations: cfg.get<boolean>('showInlineAnnotations', true),
  };
}

function isSupportedFile(filename: string): boolean {
  const exts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.cs', '.rb', '.php'];
  return exts.some((ext) => filename.endsWith(ext));
}

export function deactivate() {
  outputChannel?.appendLine('AI DevOps Extension deactivated');
}
