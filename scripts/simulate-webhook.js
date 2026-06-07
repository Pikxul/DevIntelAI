/**
 * AI DevOps Platform — Webhook Mock Simulator
 *
 * This script triggers the NestJS backend webhook endpoint with realistic GitHub
 * payload data. This simulates a real `git push` event, triggering the entire
 * AI Code Review, Risk Analysis, Static Analysis, and Deployment pipeline.
 */

const axios = require('axios');

// Configure target URLs
const PORT = process.env.PORT || 3001;
const TARGET_URL = `http://localhost:${PORT}/api/v1/webhooks/github?projectId=default-project&orgId=default-org`;

// 1. Define a realistic commit diff with vulnerabilities (to trigger high/medium risk review)
const mockDiff = `diff --git a/src/auth.ts b/src/auth.ts
index e69de29..ca80a7d 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -12,4 +12,12 @@ export function generateSessionToken(userId: string) {
-  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
+  // WARNING: Temporarily hardcoding the secret for rapid prototyping
+  return jwt.sign({ userId }, 'dev-super-secret-key-12345!', { expiresIn: '24h' });
 }
 
+export function executeQueryDirectly(userInput: string) {
+  // SECURITY RISK: SQL Injection vulnerability
+  const query = "SELECT * FROM users WHERE username = '" + userInput + "'";
+  return db.query(query);
+}
`;

// 2. Define the push payload
const pushPayload = {
  ref: 'refs/heads/feature/auth-sandbox',
  after: 'e2a8934f0d6168e3bfa7075c324c47863b9ef731',
  pusher: {
    name: 'devintel-operator',
  },
  repository: {
    full_name: 'demo-org/auth-module',
  },
  commits: [
    {
      id: 'e2a8934f0d6168e3bfa7075c324c47863b9ef731',
      message: 'feat: prototype hardcoded token signing and dynamic raw query execution',
      author: {
        name: 'devintel-operator',
      },
      timestamp: new Date().toISOString(),
      modified: ['src/auth.ts'],
      added: [],
    },
  ],
};

async function run() {
  console.log('====================================================');
  console.log('⚡  DevIntelAI Webhook Simulation Sandbox  ⚡');
  console.log('====================================================\n');
  console.log(`📡 Connecting to local NestJS backend: http://localhost:${PORT}...`);

  try {
    const response = await axios.post(TARGET_URL, pushPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'push',
        'x-hub-signature-256': 'sha256=simulated-signature-bypass-verification',
      },
    });

    console.log('\n🟢  Success! Webhook received & parsed by NestJS backend.\n');
    console.log('--- API Response Details ---');
    console.log(`Status Code : ${response.status} ${response.statusText}`);
    console.log(`Pipeline ID : ${response.data.id || 'N/A'}`);
    console.log(`Triggered By: ${response.data.triggeredBy || 'N/A'}`);
    console.log(`Status      : ${response.data.status || 'N/A'}`);
    console.log('----------------------------\n');

    console.log('👉 Next Steps:');
    console.log('1. Ensure you have the dev servers running (`pnpm dev`).');
    console.log('2. Open the web dashboard: http://localhost:3000/dashboard/pipelines');
    console.log('3. You will see the new pipeline run for "feature/auth-sandbox" starting,');
    console.log('   running the Gemini AI Code Review, and completing in real-time!\n');
  } catch (error) {
    console.error('\n🔴  Webhook delivery failed!');
    if (error.response) {
      console.error(`Status      : ${error.response.status} ${error.response.statusText}`);
      console.error('Error Body  :', JSON.stringify(error.response.data, null, 2));
      console.error('\n💡 Troubleshooting tips:');
      console.error('- Ensure your NestJS API server is active on port 3001 (`pnpm dev`).');
      console.error('- Verify `GITHUB_WEBHOOK_SKIP_VALIDATION=true` is set in your root `.env`.');
    } else {
      console.error(`Message: ${error.message}`);
      console.error('\n💡 Ensure the NestJS backend is running via `pnpm dev` before running this script.');
    }
    process.exit(1);
  }
}

run();
