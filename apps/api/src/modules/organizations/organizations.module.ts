import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization, User, InvitationEntity, AuditLogEntity } from '../../entities';
import { OrganizationsController } from './organizations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, User, InvitationEntity, AuditLogEntity])],
  controllers: [OrganizationsController],
  exports: [],
})
export class OrganizationsModule {}
