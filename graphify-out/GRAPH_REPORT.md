# Graph Report - aiDevOps  (2026-06-21)

## Corpus Check
- 126 files · ~68,079 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 760 nodes · 1516 edges · 48 communities (34 shown, 14 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1f62f222`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 44|Community 44]]

## God Nodes (most connected - your core abstractions)
1. `apiFetch()` - 49 edges
2. `ProjectsService` - 25 edges
3. `GovernanceService` - 22 edges
4. `PipelinesService` - 22 edges
5. `Project` - 19 edges
6. `WebhooksService` - 19 edges
7. `User` - 18 edges
8. `PipelineRun` - 18 edges
9. `Deployment` - 18 edges
10. `AIReviewService` - 18 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `getToken()`  [INFERRED]
  apps/web/src/app/api/github/callback/route.ts → apps/web/src/lib/api.ts
- `POST()` --calls--> `computeRisk()`  [INFERRED]
  apps/web/src/app/api/risk/route.ts → apps/web/src/components/RiskAssessment.tsx
- `AnalyticsPage()` --calls--> `useOrganizationId()`  [EXTRACTED]
  apps/web/src/app/dashboard/analytics/page.tsx → apps/web/src/hooks/useOrganizationId.ts
- `MembersTab()` --calls--> `useOrganizationId()`  [EXTRACTED]
  apps/web/src/app/dashboard/governance/page.tsx → apps/web/src/hooks/useOrganizationId.ts
- `AuditTab()` --calls--> `useOrganizationId()`  [EXTRACTED]
  apps/web/src/app/dashboard/governance/page.tsx → apps/web/src/hooks/useOrganizationId.ts

## Import Cycles
- None detected.

## Communities (48 total, 14 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (26): AIReviewModule, AIReviewProcessor, AuthModule, IdempotencyInterceptor, LoggingMiddleware, RateLimitGuard, TenantGuard, BuildsController (+18 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (22): AuthController, GithubCallbackDto, SsoCallbackDto, JwtPayload, JwtStrategy, SkipTenantCheck(), ApprovalRequestEntity, AuditArchiveLog (+14 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (17): AIReviewController, AIReviewService, AIReviewResult, WebhookEventEntity, getAIClient(), WebhooksController, GitHubPRPayload, GitHubPushPayload (+9 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (47): apiFetch(), approveRequest(), Commit, completeOnboarding(), connectGitHubAppRepo(), connectGitHubRepo(), createOrganization(), createPolicy() (+39 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (29): AnalyticsPage(), CHART_TOOLTIP_STYLE, Days, doraLevelColor, ProjectContext, ProjectContextType, ProjectProvider(), useProject() (+21 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (34): AIReviewResult, AnomalyAlert, AnomalyDetectedEvent, AnomalyType, CanaryConfig, CodeIssue, Deployment, DeploymentStrategy (+26 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (6): CommitEntity, Project, PullRequestEntity, GitHubAppService, ProjectsController, ProjectsService

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (5): AnalyticsController, AnalyticsModule, AnalyticsService, classifyDoraLevel(), DoraMetrics

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (21): activate(), AIReviewResult, applyDiagnostics(), CodeIssue, exec, generateCommitMessage(), getConfig(), getGitDiff() (+13 more)

### Community 10 - "Community 10"
Cohesion: 0.28
Nodes (11): DashboardPage(), PIPELINE_STAGES, useActiveAlerts(), useAIReviewStats(), usePipelineChartData(), usePipelineStats(), useRecentPipelines(), useRealtimeDashboard() (+3 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (10): AnomalyAlert, IncidentAlertEntity, IncidentTimelineEntity, RollbackEventEntity, RootCauseAnalysisEntity, EventsGateway, IncidentsService, MonitoringController (+2 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (6): AIClient, AIClientConfig, buildReviewResultFromJSON(), calculateCost(), COST_PER_1K_TOKENS, parseRiskLevel()

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (17): ApprovalsTab(), AuditTab(), MembersTab(), roleColors, roleIcons, roles, TabId, useOrganizationId() (+9 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (8): NotificationsController, NotificationsService, PipelineStatus, SlackBlock, SlackMessage, PipelineJobData, PipelineProcessor, sleep()

### Community 15 - "Community 15"
Cohesion: 0.20
Nodes (3): PipelinePolicy, PolicyEngineController, PolicyEngineService

### Community 16 - "Community 16"
Cohesion: 0.40
Nodes (3): Roles(), RolesGuard, RoleWeights

### Community 17 - "Community 17"
Cohesion: 0.27
Nodes (9): assertPageTitle(), assertStatCards(), assertTableHasRows(), assertVisible(), goto(), screenshot(), waitForPageReady(), NAV_ROUTES (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (6): IncidentCard(), severityConfig, timeAgo(), Incident, IncidentTimelineEvent, RootCauseAnalysis

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (9): colorMap, initialReviews, Answers, computeRisk(), WEIGHTS, dbPath, GET(), getDb() (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (5): stageIcons, statusColor, AIReviewResult, PipelineRun, PipelineStage

### Community 22 - "Community 22"
Cohesion: 0.22
Nodes (5): envColor, statusColor, strategyIcon, Deployment, rollbackDeployment()

### Community 23 - "Community 23"
Cohesion: 0.20
Nodes (9): base64url(), body, crypto, { execSync }, header, https, now, payload (+1 more)

### Community 24 - "Community 24"
Cohesion: 0.24
Nodes (3): PipelinesController, CreatePipelineRunDto, STAGE_NAMES

### Community 26 - "Community 26"
Cohesion: 0.29
Nodes (5): cpuData, errorData, requestData, services, statusStyle

### Community 30 - "Community 30"
Cohesion: 0.40
Nodes (3): features, pipeline, stats

### Community 31 - "Community 31"
Cohesion: 0.40
Nodes (4): GET(), getAuthHeaders(), getToken(), getSocket()

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (3): { chromium }, main(), updateCallbackURL()

## Knowledge Gaps
- **135 isolated node(s):** `config`, `config`, `NotificationLogEntity`, `RoleEntity`, `PermissionEntity` (+130 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getAIClient()` connect `Community 2` to `Community 11`, `Community 12`, `Community 14`, `Community 6`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `config`, `config`, `NotificationLogEntity` to the rest of the system?**
  _135 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06390977443609022 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05189189189189189 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05505279034690799 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.07164404223227752 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.06707317073170732 - nodes in this community are weakly interconnected._