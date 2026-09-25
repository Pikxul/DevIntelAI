import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { User, Organization, InvitationEntity, AuditLogEntity } from '../../entities';
import { SkipTenantCheck } from '../auth/skip-tenant-check.decorator';
import { RequirePermission } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { PermissionsService } from '../auth/permissions.service';

class UpdateOrgDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  githubInstallationId?: number;
}

class CreateOrgDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string;
}

class CreateInvitationDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsIn(['admin', 'devops_engineer', 'sre_engineer', 'security_engineer', 'developer', 'analyst', 'viewer'])
  role: string;
}

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@SkipTenantCheck()
export class OrganizationsController {
  private readonly logger = new Logger(OrganizationsController.name);

  constructor(
    @InjectRepository(Organization) private orgRepo: Repository<Organization>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(InvitationEntity) private invitationRepo: Repository<InvitationEntity>,
    @InjectRepository(AuditLogEntity) private auditLogRepo: Repository<AuditLogEntity>,
    private dataSource: DataSource,
    private permissionsService: PermissionsService,
  ) {}

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get organization by ID or slug' })
  async findOne(@Param('idOrSlug') idOrSlug: string, @Request() req: any) {
    const org = await this.orgRepo.findOne({ 
      where: this.isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug } 
    });
    if (!org) throw new NotFoundException(`Organization '${idOrSlug}' not found`);

    const reqOrgId = this.getRequestOrganizationId(req);
    if (reqOrgId !== org.id && reqOrgId !== org.slug && reqOrgId !== 'default-org') {
      throw new ForbiddenException('You do not have access to this organization');
    }

    return org;
  }

  @Put(':idOrSlug')
  @RequirePermission('org:settings')
  @ApiOperation({ summary: 'Update organization name, slug, or githubInstallationId' })
  async update(@Param('idOrSlug') idOrSlug: string, @Body() body: UpdateOrgDto, @Request() req: any) {
    const org = await this.orgRepo.findOne({ 
      where: this.isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug } 
    });
    if (!org) throw new NotFoundException(`Organization '${idOrSlug}' not found`);

    const reqOrgId = this.getRequestOrganizationId(req);
    if (reqOrgId !== org.id && reqOrgId !== org.slug && reqOrgId !== 'default-org') {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const updatePayload: Partial<Organization> = {};
    if (body.name !== undefined) updatePayload.name = body.name.trim();
    if (body.slug !== undefined) updatePayload.slug = body.slug.trim().toLowerCase();
    if (body.githubInstallationId !== undefined) updatePayload.githubInstallationId = body.githubInstallationId;

    try {
      await this.orgRepo.update(org.id, updatePayload);
      this.logger.log(`Organization '${org.id}' updated: ${JSON.stringify(updatePayload)}`);
      return this.orgRepo.findOne({ where: { id: org.id } });
    } catch (err) {
      if (err?.code === '23505') {
        throw new ConflictException('Organization name or slug is already in use');
      }
      throw err;
    }
  }

  @Post('complete-onboarding')
  @ApiOperation({ summary: 'Mark onboarding complete for the current user' })
  async completeOnboarding(@Request() req: any) {
    const userId = this.getRequestUserId(req);
    if (!userId) throw new ForbiddenException('No authenticated user');

    await this.userRepo.update(userId, { onboardingCompleted: true });
    this.logger.log(`Onboarding marked complete for user ${userId}`);
    return { success: true };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  async create(@Body() body: CreateOrgDto, @Request() req: any) {
    const userId = this.getRequestUserId(req);
    const userEmail = req.user?.email;
    if (!userId && !userEmail) throw new ForbiddenException('No authenticated user');

    const name = body.name.trim();
    const slug = body.slug.trim().toLowerCase();
    if (!name || !slug) {
      throw new BadRequestException('Organization name and slug are required');
    }

    try {
      const org = await this.dataSource.transaction(async (manager) => {
        const existingOrg = await manager.findOne(Organization, {
          where: [{ name }, { slug }],
        });
        if (existingOrg) {
          throw new ConflictException('Organization name or slug is already in use');
        }

        const createdOrg = await manager.save(
          manager.create(Organization, {
            name,
            slug,
          }),
        );

        const user = await this.findCurrentUser(manager.getRepository(User), userId, userEmail);
        if (user) {
          user.organizationId = createdOrg.id;
          user.role = 'owner';
          await manager.save(user);
        } else if (userEmail) {
          await manager.save(
            manager.create(User, {
              email: userEmail,
              name: req.user?.name || userEmail,
              organizationId: createdOrg.id,
              role: 'owner',
              provider: 'credentials',
            }),
          );
        } else {
          throw new ForbiddenException('Authenticated user could not be persisted');
        }

        return createdOrg;
      });

      this.logger.log(`Organization '${org.id}' created by user ${userId ?? userEmail}`);
      return org;
    } catch (err) {
      if (err instanceof ConflictException || err instanceof ForbiddenException) {
        throw err;
      }
      if (err?.code === '23505') {
        throw new ConflictException('Organization name or slug is already in use');
      }
      throw err;
    }
  }

  // ─── Invitations Management ───────────────────────────────────────────────────

  @Get(':idOrSlug/invitations')
  @RequirePermission('user:invite')
  @ApiOperation({ summary: 'List pending invitations for an organization' })
  async getInvitations(@Param('idOrSlug') idOrSlug: string, @Request() req: any) {
    const org = await this.orgRepo.findOne({
      where: this.isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
    });
    if (!org) throw new NotFoundException(`Organization '${idOrSlug}' not found`);

    const reqOrgId = this.getRequestOrganizationId(req);
    if (reqOrgId !== org.id && reqOrgId !== org.slug && reqOrgId !== 'default-org') {
      throw new ForbiddenException('You do not have access to this organization');
    }

    return this.invitationRepo.find({
      where: { organizationId: org.id, status: 'pending' },
      order: { createdAt: 'DESC' },
    });
  }

  @Post(':idOrSlug/invitations')
  @RequirePermission('user:invite')
  @ApiOperation({ summary: 'Invite a new member to the organization' })
  async createInvitation(
    @Param('idOrSlug') idOrSlug: string,
    @Body() body: CreateInvitationDto,
    @Request() req: any,
  ) {
    const org = await this.orgRepo.findOne({
      where: this.isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
    });
    if (!org) throw new NotFoundException(`Organization '${idOrSlug}' not found`);

    const reqOrgId = this.getRequestOrganizationId(req);
    if (reqOrgId !== org.id && reqOrgId !== org.slug && reqOrgId !== 'default-org') {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const email = body.email.toLowerCase().trim();
    const existingUser = await this.userRepo.findOne({
      where: { email, organizationId: org.id },
    });
    if (existingUser) {
      throw new ConflictException('User is already a member of this organization');
    }

    // Check if pending invitation already exists
    let invitation = await this.invitationRepo.findOne({
      where: { email, organizationId: org.id, status: 'pending' },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    if (invitation) {
      invitation.role = body.role;
      invitation.token = token;
      invitation.expiresAt = expiresAt;
      invitation.invitedBy = req.user?.email || 'owner';
    } else {
      invitation = this.invitationRepo.create({
        email,
        organizationId: org.id,
        role: body.role,
        token,
        invitedBy: req.user?.email || 'owner',
        status: 'pending',
        expiresAt,
      });
    }

    const saved = await this.invitationRepo.save(invitation);

    // Audit log
    try {
      const log = this.auditLogRepo.create({
        organizationId: org.id,
        userId: this.getRequestUserId(req) || 'system',
        userEmail: req.user?.email || 'owner',
        action: 'user:invite',
        resource: 'invitation',
        resourceId: saved.id,
        details: `Invited ${email} with role ${body.role}`,
      });
      await this.auditLogRepo.save(log);
    } catch (e: any) {
      this.logger.warn(`Failed to write audit log for invitation: ${e.message}`);
    }

    this.logger.log(`Invitation created for ${email} in org ${org.id} with role ${body.role}`);
    return saved;
  }

  @Delete(':idOrSlug/invitations/:invitationId')
  @RequirePermission('user:invite')
  @ApiOperation({ summary: 'Cancel/Revoke a pending invitation' })
  async cancelInvitation(
    @Param('idOrSlug') idOrSlug: string,
    @Param('invitationId') invitationId: string,
    @Request() req: any,
  ) {
    const org = await this.orgRepo.findOne({
      where: this.isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
    });
    if (!org) throw new NotFoundException(`Organization '${idOrSlug}' not found`);

    const reqOrgId = this.getRequestOrganizationId(req);
    if (reqOrgId !== org.id && reqOrgId !== org.slug && reqOrgId !== 'default-org') {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId, organizationId: org.id },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');

    await this.invitationRepo.delete(invitation.id);

    // Audit log
    try {
      const log = this.auditLogRepo.create({
        organizationId: org.id,
        userId: this.getRequestUserId(req) || 'system',
        userEmail: req.user?.email || 'owner',
        action: 'user:cancel_invite',
        resource: 'invitation',
        resourceId: invitationId,
        details: `Revoked invitation for ${invitation.email}`,
      });
      await this.auditLogRepo.save(log);
    } catch (e: any) {
      this.logger.warn(`Failed to write audit log for canceled invitation: ${e.message}`);
    }

    return { success: true };
  }

  private getRequestUserId(req: any): string | undefined {
    return req.user?.userId ?? req.user?.sub;
  }

  private getRequestOrganizationId(req: any): string | undefined {
    return req.user?.organizationId ?? req.user?.org;
  }

  private async findCurrentUser(
    userRepo: Repository<User>,
    userId?: string,
    email?: string,
  ): Promise<User | null> {
    const where = [];
    if (userId && this.isUuid(userId)) {
      where.push({ id: userId });
    }
    if (email) {
      where.push({ email });
    }
    if (!where.length) {
      return null;
    }
    return userRepo.findOne({ where });
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  // ─── Team Management ────────────────────────────────────────────────────────

  @Get(':idOrSlug/members')
  @ApiOperation({ summary: 'List all members of the organization' })
  @RequirePermission('user:invite')
  async listMembers(@Param('idOrSlug') idOrSlug: string, @Request() req: any) {
    const org = await this.orgRepo.findOne({
      where: this.isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
    });
    if (!org) throw new NotFoundException(`Organization '${idOrSlug}' not found`);

    const members = await this.userRepo.find({
      where: { organizationId: org.id },
      order: { createdAt: 'ASC' },
    });

    return members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      status: (m as any).status || 'active',
      firstLogin: (m as any).firstLogin ?? false,
      avatarUrl: m.avatarUrl,
      createdAt: m.createdAt,
    }));
  }

  @Post(':idOrSlug/members')
  @ApiOperation({ summary: 'Create a team member with a temporary password' })
  @RequirePermission('user:invite')
  async createMember(
    @Param('idOrSlug') idOrSlug: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    const { name, email, role } = body;
    if (!name || !email || !role) {
      throw new BadRequestException('name, email, and role are required');
    }

    const validRoles = ['admin', 'devops_engineer', 'sre_engineer', 'security_engineer', 'developer', 'analyst', 'viewer'];
    if (!validRoles.includes(role)) {
      throw new BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    const org = await this.orgRepo.findOne({
      where: this.isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
    });
    if (!org) throw new NotFoundException(`Organization '${idOrSlug}' not found`);

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(6).toString('base64url').substring(0, 10);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Create user
    const user = this.userRepo.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      organizationId: org.id,
      onboardingCompleted: false,
    } as any);
    (user as any).status = 'active';
    (user as any).firstLogin = true;
    const savedUser = await this.userRepo.save(user) as unknown as User;

    // Assign role in permissions system
    await this.permissionsService.assignUserRole(savedUser.id, role);

    // Audit log
    try {
      await this.auditLogRepo.save(this.auditLogRepo.create({
        organizationId: org.id,
        userId: this.getRequestUserId(req) || 'system',
        userEmail: normalizedEmail,
        action: 'member_created',
        resource: 'user',
        resourceId: savedUser.id,
        details: `Team member ${name} created with role ${role}`,
      }));
    } catch (e) {
      this.logger.warn(`Failed to write audit log for member creation: ${e.message}`);
    }

    return {
      member: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        status: 'active',
        firstLogin: true,
      },
      temporaryPassword: tempPassword,
      message: `Member created. Provide them these credentials: email: ${normalizedEmail}, temporary password: ${tempPassword}`,
    };
  }

  @Put(':idOrSlug/members/:memberId/status')
  @ApiOperation({ summary: 'Activate or deactivate a team member' })
  @RequirePermission('user:assign_role')
  async updateMemberStatus(
    @Param('idOrSlug') idOrSlug: string,
    @Param('memberId') memberId: string,
    @Body() body: { status: 'active' | 'deactivated' },
    @Request() req: any,
  ) {
    if (!body.status || !['active', 'deactivated'].includes(body.status)) {
      throw new BadRequestException('status must be "active" or "deactivated"');
    }

    const org = await this.orgRepo.findOne({
      where: this.isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
    });
    if (!org) throw new NotFoundException(`Organization '${idOrSlug}' not found`);

    const member = await this.userRepo.findOne({ where: { id: memberId, organizationId: org.id } });
    if (!member) throw new NotFoundException('Member not found in this organization');

    // Prevent deactivating yourself
    const requesterId = this.getRequestUserId(req);
    if (member.id === requesterId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    // Prevent deactivating the organization owner
    if (member.role === 'owner') {
      throw new ForbiddenException('Cannot deactivate the organization owner');
    }

    await this.userRepo.update(memberId, { status: body.status } as any);

    try {
      await this.auditLogRepo.save(this.auditLogRepo.create({
        organizationId: org.id,
        userId: requesterId || 'system',
        userEmail: member.email,
        action: body.status === 'deactivated' ? 'member_deactivated' : 'member_activated',
        resource: 'user',
        resourceId: memberId,
        details: `Member ${member.name} status changed to ${body.status}`,
      }));
    } catch (e) {
      this.logger.warn(`Failed to write audit log: ${e.message}`);
    }

    return { success: true, memberId, status: body.status };
  }

  @Put(':idOrSlug/members/:memberId/role')
  @ApiOperation({ summary: 'Change a team member\'s role' })
  @RequirePermission('user:assign_role')
  async updateMemberRole(
    @Param('idOrSlug') idOrSlug: string,
    @Param('memberId') memberId: string,
    @Body() body: { role: string },
    @Request() req: any,
  ) {
    const validRoles = ['admin', 'devops_engineer', 'sre_engineer', 'security_engineer', 'developer', 'analyst', 'viewer'];
    if (!body.role || !validRoles.includes(body.role)) {
      throw new BadRequestException(`role must be one of: ${validRoles.join(', ')}`);
    }

    const org = await this.orgRepo.findOne({
      where: this.isUuid(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
    });
    if (!org) throw new NotFoundException(`Organization '${idOrSlug}' not found`);

    const member = await this.userRepo.findOne({ where: { id: memberId, organizationId: org.id } });
    if (!member) throw new NotFoundException('Member not found in this organization');

    // Prevent changing owner role
    if (member.role === 'owner') {
      throw new ForbiddenException('Cannot change the owner\'s role');
    }

    const oldRole = member.role;
    await this.userRepo.update(memberId, { role: body.role });
    await this.permissionsService.assignUserRole(memberId, body.role);

    try {
      await this.auditLogRepo.save(this.auditLogRepo.create({
        organizationId: org.id,
        userId: this.getRequestUserId(req) || 'system',
        userEmail: member.email,
        action: 'member_role_changed',
        resource: 'user',
        resourceId: memberId,
        details: `Role changed from ${oldRole} to ${body.role}`,
      }));
    } catch (e) {
      this.logger.warn(`Failed to write audit log: ${e.message}`);
    }

    return { success: true, memberId, oldRole, newRole: body.role };
  }
}
