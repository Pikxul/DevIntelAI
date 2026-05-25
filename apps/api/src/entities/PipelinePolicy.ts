import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import type { PolicyRule, PolicyDecision, PipelinePolicy as IPipelinePolicy } from '@aidevops/shared-types';

@Entity('pipeline_policies')
export class PipelinePolicy implements IPipelinePolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @Column({ nullable: true })
  projectId?: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column('jsonb')
  rules: PolicyRule[];

  @Column()
  action: PolicyDecision;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: string;

  @UpdateDateColumn()
  updatedAt: string;
}
