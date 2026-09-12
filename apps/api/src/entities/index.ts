import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) name: string;
  @Column({ unique: true }) slug: string;
  @Column({ default: 'active' }) status: string; // 'active' | 'suspended'
  @Column({ default: 'free' }) plan: string;
  @Column({ nullable: true }) githubInstallationId: number;    // GitHub App installation (Step 5)
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) email: string;
  @Column() name: string;
  @Column({ nullable: true }) avatarUrl: string;
  @Column({ nullable: true }) password?: string;
  @Column() organizationId: string;
  @Column({ default: 'developer' }) role: string;
  @Column({ default: 'active' }) status: string; // 'active' | 'deactivated'
  @Column({ default: false }) firstLogin: boolean;
  @Column({ nullable: true }) githubId: string;
  @Column({ nullable: true }) githubUsername: string;
  @Column({ nullable: true }) githubAccessToken: string;  // GitHub OAuth token for listing user's repos
  @Column({ default: 'credentials' }) provider: string; // 'github' | 'google' | 'credentials' | 'sso'
  @Column({ default: false }) onboardingCompleted: boolean;   // Tracks completion of onboarding wizard
  @Column({ nullable: true }) invitedBy?: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() organizationId: string;
  @Column() name: string;
  @Column({ unique: true }) slug: string;
  @Column() repoUrl: string;
  @Column({ default: 'github' }) repoProvider: string;
  @Column({ default: 'main' }) defaultBranch: string;
  @Column({ type: 'jsonb', default: '[]' }) deploymentTargets: object[];
  @Column({ default: 70 }) riskThreshold: number;
  @Column({ nullable: true }) webhookSecret: string;           // GitHub HMAC secret
  @Column({ nullable: true }) gitlabWebhookSecret: string;     // GitLab token secret (G2.4)
  @Column({ nullable: true }) githubRepoFullName: string; // e.g. 'owner/repo'
  @Column({ nullable: true }) vaultSecretPath: string;
  @Column({ default: 'pending' }) syncStatus: string; // 'pending' | 'syncing' | 'completed' | 'failed'
  @Column({ nullable: true, type: 'timestamp' }) lastSyncedAt: Date;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('pipeline_runs')
export class PipelineRun {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() projectId: string;
  @Column() organizationId: string;
  @Column() commitSha: string;
  @Column() branch: string;
  @Column() author: string;
  @Column({ nullable: true }) message: string;
  @Column({ nullable: true }) prNumber: number;
  @Column({ nullable: true }) prUrl: string;
  @Column({ default: 'pending' }) status: string;
  @Column({ type: 'jsonb', default: '[]' }) stages: object[];
  @Column({ default: 'push' }) triggeredBy: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @Column({ nullable: true }) completedAt: Date;
}

@Entity('ai_review_results')
export class AIReviewResult {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() pipelineRunId: string;
  @Column() provider: string;
  @Column() model: string;
  @Column({ type: 'jsonb' }) riskScore: object;
  @Column({ type: 'jsonb', default: '[]' }) issues: object[];
  @Column({ type: 'text' }) summary: string;
  @Column({ type: 'jsonb', default: '[]' }) recommendations: object[];
  @Column({ default: false }) approved: boolean;
  @Column({ nullable: true }) blockedReason: string;
  @Column({ default: 0 }) tokensUsed: number;
  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0 }) costUsd: number;
  @CreateDateColumn() createdAt: Date;
}

@Entity('deployments')
export class Deployment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() pipelineRunId: string;
  @Column({ type: 'jsonb' }) target: object;
  @Column() imageTag: string;
  @Column({ default: 'pending' }) status: string;
  @Column({ default: 'rolling' }) strategy: string;
  @Column({ nullable: true }) previousImageTag: string;
  @Column({ nullable: true }) canaryWeight: number;
  @CreateDateColumn() startedAt: Date;
  @Column({ nullable: true }) completedAt: Date;
  @Column({ nullable: true }) rolledBackAt: Date;
  @Column({ nullable: true }) rollbackReason: string;
}

@Entity('anomaly_alerts')
export class AnomalyAlert {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() deploymentId: string;
  @Column() type: string;
  @Column() severity: string;
  @Column() title: string;
  @Column({ type: 'text' }) description: string;
  @Column() metric: string;
  @Column({ type: 'decimal' }) currentValue: number;
  @Column({ type: 'jsonb' }) expectedRange: object;
  @Column({ type: 'decimal', precision: 4, scale: 3 }) confidence: number;
  @Column({ type: 'text' }) recommendation: string;
  @Column({ default: false }) autoRollbackTriggered: boolean;
  @CreateDateColumn() detectedAt: Date;
}

@Entity('incident_alerts')
export class IncidentAlertEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() projectId: string;
  @Column({ nullable: true }) deploymentId: string;
  @Column() environment: string;
  @Column() source: string;
  @Column() severity: string;
  @Column() title: string;
  @Column({ type: 'text' }) description: string;
  @Column({ nullable: true }) metric: string;
  @Column({ type: 'decimal', nullable: true }) value: number;
  @Column({ type: 'decimal', nullable: true }) threshold: number;
  @Column({ default: 'open' }) status: string; // 'open' | 'investigating' | 'resolved'
  @Column({ nullable: true }) resolvedAt: Date;
  @CreateDateColumn() timestamp: Date;
}

@Entity('root_cause_analyses')
export class RootCauseAnalysisEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() incidentId: string;
  @Column({ type: 'text' }) summary: string;
  @Column({ type: 'text' }) hypothesis: string;
  @Column({ type: 'text' }) rootCause: string;
  @Column({ type: 'jsonb', default: '[]' }) affectedComponents: string[];
  @Column({ type: 'jsonb', default: '[]' }) recommendedActions: string[];
  @Column({ type: 'decimal', precision: 5, scale: 2 }) confidenceScore: number;
  @CreateDateColumn() generatedAt: Date;
}

@Entity('rollback_events')
export class RollbackEventEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() incidentId: string;
  @Column() deploymentId: string;
  @Column() previousDeploymentId: string;
  @Column() status: string;
  @Column({ type: 'text' }) reason: string;
  @Column() triggeredBy: string;
  @CreateDateColumn() triggeredAt: Date;
  @Column({ nullable: true }) completedAt: Date;
}

@Entity('approval_requests')
export class ApprovalRequestEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) pipelineRunId: string;
  @Column() projectId: string;
  @Column() organizationId: string;
  @Column() requestedBy: string;
  @Column({ nullable: true }) reviewedBy: string;
  @Column({ default: 'pending' }) status: string; // 'pending' | 'approved' | 'rejected'
  @Column({ type: 'text', nullable: true }) reason: string;
  @CreateDateColumn() createdAt: Date;
  @Column({ nullable: true }) reviewedAt: Date;
}

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() organizationId: string;
  @Column() userId: string;
  @Column() userEmail: string;
  @Column() action: string;
  @Column() resource: string;
  @Column() resourceId: string;
  @Column({ type: 'text', nullable: true }) details: string;
  @Column({ nullable: true }) hash: string;
  @Column({ nullable: true }) parentHash: string;
  @CreateDateColumn() createdAt: Date;
}

@Entity('commits')
export class CommitEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() projectId: string;
  @Column() organizationId: string;
  @Column() sha: string;
  @Column() branch: string;
  @Column() author: string;
  @Column({ type: 'text' }) message: string;
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true }) riskScore: number;
  @Column({ nullable: true }) riskLevel: string; // 'low' | 'medium' | 'high' | 'critical'
  @Column({ type: 'text', nullable: true }) analysisSummary: string;
  @CreateDateColumn() createdAt: Date;
}

@Entity('pull_requests')
export class PullRequestEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() projectId: string;
  @Column() organizationId: string;
  @Column() number: number;
  @Column() title: string;
  @Column({ default: 'open' }) state: string; // 'open' | 'closed' | 'merged'
  @Column() author: string;
  @Column() url: string;
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true }) riskScore: number;
  @Column({ nullable: true }) riskLevel: string; // 'low' | 'medium' | 'high' | 'critical'
  @Column({ type: 'text', nullable: true }) analysisSummary: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @Column({ type: 'timestamp', nullable: true }) mergedAt: Date | null;
}

@Entity('webhook_events')
export class WebhookEventEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', nullable: true }) projectId: string | null;
  @Column() provider: string; // 'github' | 'gitlab'
  @Column() eventType: string; // 'push' | 'pull_request' | etc.
  @Column({ type: 'jsonb' }) payload: object;
  @Column({ default: false }) processed: boolean;
  @Column({ type: 'timestamp', nullable: true }) processedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
}

@Entity('incident_timeline')
export class IncidentTimelineEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() incidentId: string;
  @Column() title: string;
  @Column({ type: 'text' }) description: string;
  @Column() type: string; // 'detected' | 'investigating' | 'rca_generated' | 'rollback_started' | 'rollback_completed' | 'resolved'
  @CreateDateColumn() timestamp: Date;
}

@Entity('notification_logs')
export class NotificationLogEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ nullable: true }) projectId: string;
  @Column() channel: string; // 'slack' | 'teams' | 'jira' | 'email' | 'webhook'
  @Column() event: string; // e.g. 'pipeline_failed', 'anomaly_detected'
  @Column({ nullable: true }) recipient: string;
  @Column() status: string; // 'sent' | 'failed'
  @Column({ type: 'text', nullable: true }) error: string;
  @CreateDateColumn() createdAt: Date;
}

@Entity('roles')
export class RoleEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) name: string; // 'owner' | 'admin' | 'manager' | 'engineer' | 'viewer'
  @Column({ nullable: true }) description: string;
}

@Entity('permissions')
export class PermissionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) name: string; // e.g. 'pipeline:trigger', 'deployment:rollback', 'policy:write', etc.
  @Column({ nullable: true }) description: string;
}

@Entity('role_permissions')
export class RolePermissionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() roleId: string;
  @Column() permissionId: string;
}

@Entity('sso_configurations')
export class SSOConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column({ unique: true })
  domain: string; // e.g. "enterprise.com"

  @Column()
  provider: string; // 'saml' | 'oidc'

  @Column({ type: 'text' })
  entryPoint: string; // IDP Single Sign-On URL

  @Column({ type: 'text', nullable: true })
  issuer: string; // IDP Entity ID / Issuer

  @Column({ type: 'text', nullable: true })
  cert: string; // Public IDP X.509 certificate used for validation

  @Column({ nullable: true })
  clientId: string; // OIDC client ID

  @Column({ nullable: true })
  clientSecret: string; // OIDC encrypted client secret

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('audit_archive_logs')
export class AuditArchiveLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() organizationId: string;
  @Column() startDate: Date;
  @Column() endDate: Date;
  @Column() s3Key: string; // S3 path
  @Column() checksum: string; // MD5 content checksum
  @Column() rowCount: number;
  @Column() retentionPeriodYears: number; // e.g. 7
  @CreateDateColumn() archivedAt: Date;
}

export * from './PipelinePolicy';

@Entity('invitations')
export class InvitationEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() email: string;
  @Column() organizationId: string;
  @Column() role: string;
  @Column() token: string;
  @Column() invitedBy: string;
  @Column({ default: 'pending' }) status: string; // 'pending' | 'accepted' | 'expired'
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
  @Column({ type: 'timestamp', nullable: true }) expiresAt: Date;
}

@Entity('user_roles')
export class UserRoleEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() userId: string;
  @Column() roleId: string;
  @CreateDateColumn() createdAt: Date;
}




