# Graph Report - aiDevOps  (2026-07-06)

## Corpus Check
- 152 files · ~83,572 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 224 nodes · 317 edges · 18 communities (5 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1ca04da9`
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

## God Nodes (most connected - your core abstractions)
1. `ProjectsController` - 14 edges
2. `AuthController` - 13 edges
3. `PermissionsGuard` - 13 edges
4. `PermissionsService` - 11 edges
5. `MonitoringController` - 11 edges
6. `RequirePermission()` - 10 edges
7. `GovernanceController` - 10 edges
8. `OrganizationsController` - 10 edges
9. `AIReviewController` - 8 edges
10. `scripts` - 7 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (18 total, 13 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (29): GithubCallbackDto, SsoCallbackDto, AuthModule, ROLE_PERMISSION_SEED, AIReviewResult, AnomalyAlert, ApprovalRequestEntity, AuditArchiveLog (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (33): dependencies, @aidevops/ai-client, @aidevops/shared-types, axios, bcrypt, bull, class-transformer, class-validator (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (24): devDependencies, jest, @nestjs/cli, @nestjs/schematics, @nestjs/testing, ts-jest, @types/bcrypt, @types/bull (+16 more)

### Community 3 - "Community 3"
Cohesion: 0.35
Nodes (4): RequirePermission(), PermissionsGuard, CreateOrgDto, UpdateOrgDto

### Community 15 - "Community 15"
Cohesion: 0.40
Nodes (3): features, pipeline, stats

## Knowledge Gaps
- **80 isolated node(s):** `name`, `version`, `private`, `build`, `dev` (+75 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PermissionsGuard` connect `Community 3` to `Community 0`, `Community 11`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `ProjectsController` connect `Community 4` to `Community 3`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `MonitoringController` connect `Community 6` to `Community 3`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _80 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0960960960960961 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._