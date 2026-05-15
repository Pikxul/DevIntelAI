import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DeploymentsService } from './deployments.service';
import type { DeploymentTarget } from '@aidevops/shared-types';

@ApiTags('deployments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('deployments')
export class DeploymentsController {
  constructor(private readonly service: DeploymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Trigger a deployment' })
  deploy(@Body() body: { pipelineRunId: string; target: DeploymentTarget; imageTag: string; previousImageTag?: string }) {
    return this.service.deploy(body);
  }

  @Post(':id/rollback')
  @ApiOperation({ summary: 'Rollback a deployment' })
  rollback(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.service.rollback(id, body.reason);
  }

  @Get()
  @ApiOperation({ summary: 'List recent deployments' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deployment details' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
