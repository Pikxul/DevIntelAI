import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PolicyEngineService } from './policy-engine.service';
import { PipelinePolicy } from '../../entities/PipelinePolicy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { GovernanceService } from '../governance/governance.service';

@ApiTags('policies')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('policies')
export class PolicyEngineController {
  constructor(
    private readonly service: PolicyEngineService,
    private readonly governanceService: GovernanceService,
  ) {}

  @Get()
  @Roles('viewer', 'developer', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List policies for an organization' })
  getPolicies(@Query('organizationId') organizationId: string) {
    return this.service.getPolicies(organizationId);
  }

  @Post()
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create a new pipeline policy' })
  async createPolicy(@Body() dto: Partial<PipelinePolicy>, @Request() req: any) {
    const policy = await this.service.createPolicy(dto);
    const user = req.user;
    if (user) {
      await this.governanceService.addAuditLog({
        organizationId: user.organizationId,
        userId: user.userId,
        userEmail: user.email,
        action: 'create_policy',
        resource: 'policy',
        resourceId: policy.id,
        details: `Created policy: "${policy.name}" with action "${policy.action}"`,
      });
    }
    return policy;
  }

  @Put(':id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Update a pipeline policy' })
  async updatePolicy(@Param('id') id: string, @Body() dto: Partial<PipelinePolicy>, @Request() req: any) {
    const policy = await this.service.updatePolicy(id, dto);
    const user = req.user;
    if (user && policy) {
      await this.governanceService.addAuditLog({
        organizationId: user.organizationId,
        userId: user.userId,
        userEmail: user.email,
        action: 'update_policy',
        resource: 'policy',
        resourceId: id,
        details: `Updated policy: "${policy.name}"`,
      });
    }
    return policy;
  }

  @Patch(':id/toggle')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Toggle a policy enabled/disabled' })
  async togglePolicy(@Param('id') id: string, @Request() req: any) {
    const policies = await this.service.getPolicies('');
    const policy = policies.find(p => p.id === id);
    if (!policy) return null;

    const newStatus = !policy.enabled;
    const updated = await this.service.updatePolicy(id, { enabled: newStatus });
    
    const user = req.user;
    if (user && updated) {
      await this.governanceService.addAuditLog({
        organizationId: user.organizationId,
        userId: user.userId,
        userEmail: user.email,
        action: 'toggle_policy',
        resource: 'policy',
        resourceId: id,
        details: `Toggled policy "${policy.name}" to ${newStatus ? 'enabled' : 'disabled'}`,
      });
    }
    return updated;
  }

  @Delete(':id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Delete a pipeline policy' })
  async deletePolicy(@Param('id') id: string, @Request() req: any) {
    const policies = await this.service.getPolicies('');
    const policy = policies.find(p => p.id === id);
    
    await this.service.deletePolicy(id);
    
    const user = req.user;
    if (user && policy) {
      await this.governanceService.addAuditLog({
        organizationId: user.organizationId,
        userId: user.userId,
        userEmail: user.email,
        action: 'delete_policy',
        resource: 'policy',
        resourceId: id,
        details: `Deleted policy: "${policy.name}"`,
      });
    }
    return { success: true };
  }
}
