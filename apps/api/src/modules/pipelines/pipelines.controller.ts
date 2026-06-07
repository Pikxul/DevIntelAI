import { Controller, Get, Post, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PipelinesService, CreatePipelineRunDto } from './pipelines.service';

@ApiTags('pipelines')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('pipelines')
export class PipelinesController {
  constructor(private readonly service: PipelinesService) {}

  @Post()
  @ApiOperation({ summary: 'Trigger a new pipeline run (also triggered by webhooks)' })
  create(@Body() dto: CreatePipelineRunDto) {
    return this.service.create(dto);
  }

  @Post('trigger')
  @ApiOperation({ summary: 'Manually trigger a pipeline run' })
  triggerDemo(
    @Body() body: {
      projectId?: string;
      organizationId?: string;
      branch?: string;
      author?: string;
      message?: string;
      diff?: string;
    },
  ) {
    if (!body.projectId) {
      throw new BadRequestException('projectId is required');
    }
    if (!body.organizationId) {
      throw new BadRequestException('organizationId is required');
    }

    return this.service.create({
      projectId: body.projectId,
      organizationId: body.organizationId,
      commitSha: Math.random().toString(16).slice(2, 9),
      branch: body.branch ?? 'main',
      author: body.author ?? 'dev@example.com',
      message: body.message ?? 'feat: manual test trigger',
      triggeredBy: 'manual',
      diff: body.diff,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List pipeline runs for an organization' })
  findAll(
    @Query('organizationId') organizationId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.service.findAll(organizationId, projectId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get pipeline statistics' })
  getStats(@Query('organizationId') organizationId: string) {
    return this.service.getStats(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific pipeline run' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
