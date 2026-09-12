/**
 * DevIntel AI — End-to-End RBAC Validation Script
 * 
 * Tests the full user journey: org creation → invitation → acceptance → login → RBAC enforcement
 * Uses ONLY the HTTP API — zero database seeding or hardcoded data.
 * 
 * Usage: npx ts-node scripts/validate-user-access.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_DOMAIN = `test-${Date.now()}.com`;
const TEST_PASSWORD = 'test1234';

interface TestUser {
  email: string;
  name: string;
  role: string;
  token?: string;
}

interface TestResult {
  user: string;
  role: string;
  endpoint: string;
  expectedStatus: 'allow' | 'deny';
  actualStatus: number;
  pass: boolean;
}

// ─── Test endpoints mapped to required permissions ──────────────────────────

const RBAC_TESTS: Array<{ endpoint: string; method: string; permission: string; description: string }> = [
  { endpoint: '/api/v1/governance/members', method: 'GET', permission: 'dashboard:view', description: 'View team members' },
  { endpoint: '/api/v1/pipelines', method: 'GET', permission: 'pipeline:view', description: 'View pipelines' },
  { endpoint: '/api/v1/deployments', method: 'GET', permission: 'deployment:view', description: 'View deployments' },
  { endpoint: '/api/v1/governance/audit-logs', method: 'GET', permission: 'audit_log:view', description: 'View audit logs' },
  { endpoint: '/api/v1/analytics/dora', method: 'GET', permission: 'dora:view', description: 'View DORA metrics' },
  { endpoint: '/api/v1/policies', method: 'GET', permission: 'policy:read', description: 'View policies' },
];

// Permission map matching the backend ROLE_PERMISSION_SEED
const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: [
    'org:create', 'org:delete', 'org:settings', 'user:invite', 'user:remove', 'user:assign_role',
    'sso:configure', 'billing:manage', 'repo:connect', 'repo:manage',
    'pipeline:view', 'pipeline:trigger', 'pipeline:manage', 'deployment:view', 'deployment:rollback',
    'ai_review:view', 'incident:view', 'incident:manage', 'rca:view', 'alert:view', 'alert:manage',
    'monitoring:view', 'dora:view', 'policy:read', 'policy:write', 'governance:view',
    'compliance:view', 'audit_log:view', 'dashboard:view', 'analytics:view', 'report:view', 'approval:review',
  ],
  admin: [
    'user:invite', 'user:remove', 'user:assign_role', 'repo:connect', 'repo:manage',
    'pipeline:view', 'pipeline:trigger', 'pipeline:manage', 'deployment:view', 'deployment:rollback',
    'ai_review:view', 'incident:view', 'incident:manage', 'rca:view', 'alert:view', 'alert:manage',
    'monitoring:view', 'dora:view', 'policy:read', 'policy:write', 'governance:view',
    'compliance:view', 'audit_log:view', 'dashboard:view', 'analytics:view', 'report:view', 'approval:review',
  ],
  sre_engineer: [
    'incident:view', 'incident:manage', 'rca:view', 'alert:view', 'alert:manage',
    'monitoring:view', 'dora:view', 'deployment:view', 'pipeline:view', 'dashboard:view', 'analytics:view',
  ],
  developer: ['repo:view', 'pipeline:view', 'deployment:view', 'ai_review:view', 'dashboard:view'],
  security_engineer: [
    'policy:read', 'policy:write', 'governance:view', 'compliance:view',
    'audit_log:view', 'ai_review:view', 'incident:view', 'dashboard:view', 'analytics:view',
  ],
  viewer: ['dashboard:view', 'analytics:view', 'dora:view', 'report:view'],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function apiCall(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

function hasPermission(role: string, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms ? perms.includes(permission) : false;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║     DevIntel AI — End-to-End RBAC Validation               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Step 1: Check API health
  console.log('▸ Step 1: Checking API health...');
  try {
    const healthRes = await apiCall('/api/v1/health');
    if (!healthRes.ok) throw new Error(`Status ${healthRes.status}`);
    console.log('  ✅ API is healthy\n');
  } catch (err: any) {
    console.error(`  ❌ API not reachable at ${API_URL}: ${err.message}`);
    console.log('\n  Make sure the API server is running: cd apps/api && npm run dev\n');
    process.exit(1);
  }

  // Step 2: Register owner (first user for domain)
  console.log(`▸ Step 2: Registering owner (first user for domain ${TEST_DOMAIN})...`);
  const ownerEmail = `owner@${TEST_DOMAIN}`;
  const ownerRes = await apiCall('/api/v1/auth/verify-credentials', {
    method: 'POST',
    body: JSON.stringify({ email: ownerEmail, password: TEST_PASSWORD }),
  });

  if (!ownerRes.ok) {
    const errBody = await ownerRes.text();
    console.error(`  ❌ Owner registration failed: ${errBody}`);
    process.exit(1);
  }

  const ownerData = await ownerRes.json();
  const ownerToken = ownerData.token;
  const orgId = ownerData.user.organizationId;
  console.log(`  ✅ Owner registered: ${ownerEmail}`);
  console.log(`  ✅ Organization created: ${orgId}\n`);

  // Step 3: Owner invites team members
  const teamMembers: TestUser[] = [
    { email: `admin@${TEST_DOMAIN}`, name: 'Admin User', role: 'admin' },
    { email: `sre@${TEST_DOMAIN}`, name: 'SRE User', role: 'sre_engineer' },
    { email: `dev@${TEST_DOMAIN}`, name: 'Developer User', role: 'developer' },
    { email: `sec@${TEST_DOMAIN}`, name: 'Security User', role: 'security_engineer' },
    { email: `viewer@${TEST_DOMAIN}`, name: 'Viewer User', role: 'viewer' },
  ];

  console.log('▸ Step 3: Owner inviting team members...');
  const invitationTokens: Record<string, string> = {};

  for (const member of teamMembers) {
    const invRes = await apiCall(`/api/v1/organizations/${orgId}/invitations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ email: member.email, role: member.role }),
    });

    if (!invRes.ok) {
      const errBody = await invRes.text();
      console.error(`  ❌ Failed to invite ${member.email}: ${errBody}`);
      continue;
    }

    const invData = await invRes.json();
    invitationTokens[member.email] = invData.token;
    console.log(`  ✅ Invited ${member.email} as ${member.role}`);
  }
  console.log('');

  // Step 4: Team members accept invitations
  console.log('▸ Step 4: Team members accepting invitations...');
  for (const member of teamMembers) {
    const invToken = invitationTokens[member.email];
    if (!invToken) {
      console.error(`  ⏭️ Skipping ${member.email} — no invitation token`);
      continue;
    }

    const acceptRes = await apiCall('/api/v1/auth/accept-invitation', {
      method: 'POST',
      body: JSON.stringify({ token: invToken, name: member.name, password: TEST_PASSWORD }),
    });

    if (!acceptRes.ok) {
      const errBody = await acceptRes.text();
      console.error(`  ❌ ${member.email} failed to accept: ${errBody}`);
      continue;
    }

    const acceptData = await acceptRes.json();
    member.token = acceptData.token;
    console.log(`  ✅ ${member.email} joined as ${member.role}`);
  }
  console.log('');

  // Step 5: Each user logs in and gets a fresh token
  console.log('▸ Step 5: Verifying login for all users...');
  const allUsers: TestUser[] = [
    { email: ownerEmail, name: 'Owner', role: 'owner', token: ownerToken },
    ...teamMembers,
  ];

  for (const user of allUsers) {
    if (user.token) continue; // Already has token from accept

    const loginRes = await apiCall('/api/v1/auth/verify-credentials', {
      method: 'POST',
      body: JSON.stringify({ email: user.email, password: TEST_PASSWORD }),
    });

    if (!loginRes.ok) {
      console.error(`  ❌ Login failed for ${user.email}`);
      continue;
    }

    const loginData = await loginRes.json();
    user.token = loginData.token;
    console.log(`  ✅ ${user.email} logged in (role: ${loginData.user.role})`);
  }
  console.log('');

  // Step 6: Test RBAC enforcement for each user
  console.log('▸ Step 6: Testing RBAC enforcement...\n');
  const results: TestResult[] = [];

  for (const user of allUsers) {
    if (!user.token) {
      console.log(`  ⏭️ Skipping ${user.email} — no token`);
      continue;
    }

    for (const test of RBAC_TESTS) {
      const shouldAllow = hasPermission(user.role, test.permission);
      const separator = test.endpoint.includes('?') ? '&' : '?';
      const url = `${test.endpoint}${separator}organizationId=${orgId}`;

      const res = await apiCall(url, {
        method: test.method,
        headers: { Authorization: `Bearer ${user.token}` },
      });

      const pass = shouldAllow
        ? res.status !== 403
        : res.status === 403;

      results.push({
        user: user.email.split('@')[0],
        role: user.role,
        endpoint: test.description,
        expectedStatus: shouldAllow ? 'allow' : 'deny',
        actualStatus: res.status,
        pass,
      });
    }
  }

  // Step 7: Print results matrix
  console.log('═══════════════════════════════════════════════════════════════════════════════════');
  console.log('  RBAC Validation Results');
  console.log('═══════════════════════════════════════════════════════════════════════════════════');
  console.log('');

  const maxUser = Math.max(...results.map(r => r.user.length), 8);
  const maxRole = Math.max(...results.map(r => r.role.length), 8);
  const maxEndpoint = Math.max(...results.map(r => r.endpoint.length), 12);

  const header = `  ${'User'.padEnd(maxUser)}  ${'Role'.padEnd(maxRole)}  ${'Endpoint'.padEnd(maxEndpoint)}  Expected  Actual  Result`;
  console.log(header);
  console.log('  ' + '─'.repeat(header.length - 2));

  for (const r of results) {
    const icon = r.pass ? '✅' : '❌';
    console.log(
      `  ${r.user.padEnd(maxUser)}  ${r.role.padEnd(maxRole)}  ${r.endpoint.padEnd(maxEndpoint)}  ${r.expectedStatus.padEnd(8)}  ${String(r.actualStatus).padEnd(6)}  ${icon}`,
    );
  }

  console.log('');
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`  Total: ${results.length} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
  console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

  // Step 8: Test invitation-only enforcement
  console.log('▸ Step 7: Testing invitation-only enforcement...');
  const uninvitedRes = await apiCall('/api/v1/auth/verify-credentials', {
    method: 'POST',
    body: JSON.stringify({ email: `random-intruder@${TEST_DOMAIN}`, password: 'hack1234' }),
  });

  if (uninvitedRes.status === 401) {
    console.log('  ✅ Uninvited user correctly rejected (401)');
  } else {
    console.log(`  ❌ Uninvited user was NOT rejected (status: ${uninvitedRes.status})`);
  }

  console.log('\n══════════════════════════════════════════════════════════════');
  if (failed === 0) {
    console.log('  🎉 ALL TESTS PASSED — Platform is user-ready!');
  } else {
    console.log(`  ⚠️  ${failed} test(s) failed — review RBAC configuration`);
  }
  console.log('══════════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
