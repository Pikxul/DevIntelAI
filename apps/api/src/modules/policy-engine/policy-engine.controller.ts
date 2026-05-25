import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PolicyEngineService } from './policy-engine.service';
import { PipelinePolicy } from '../../entities/PipelinePolicy';

@ApiTags('policies')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('policies')
export class PolicyEngineController {
  constructor(private readonly service: PolicyEngineService) {}

  @Get()
  @ApiOperation({ summary: 'List policies for an organization' })
  getPolicies(@Query('organizationId') organizationId: string) {
    return this.service.getPolicies(organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new pipeline policy' })
  createPolicy(@Body() dto: Partial<PipelinePolicy>) {
    return this.service.createPolicy(dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a pipeline policy' })
  deletePolicy(@Param('id') id: string) {
    return this.service.deletePolicy(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a pipeline policy' })
  updatePolicy(@Param('id') id: string, @Body() dto: Partial<PipelinePolicy>) {
    return this.service.updatePolicy(id, dto);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle a policy enabled/disabled' })
  async togglePolicy(@Param('id') id: string) {
    const policies = await this.service.getPolicies('');
    const policy = policies.find(p => p.id === id);
    if (!policy) return null;
    return this.service.updatePolicy(id, { enabled: !policy.enabled });
  }
}
