import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) name: string;
  @Column({ unique: true }) slug: string;
  @Column({ default: 'free' }) plan: string;
  @CreateDateColumn() createdAt: Date;
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) email: string;
  @Column() name: string;
  @Column({ nullable: true }) avatarUrl: string;
  @Column() organizationId: string;
  @Column({ default: 'developer' }) role: string;
  @CreateDateColumn() createdAt: Date;
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
  @CreateDateColumn() createdAt: Date;
}

export * from './PipelinePolicy';

