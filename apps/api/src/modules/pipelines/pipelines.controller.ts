import { Controller, Get, Post, Body, Param, Query, UseGuards, BadRequestException, Request } from '@nestjs/common';
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
  create(@Body() dto: CreatePipelineRunDto, @Request() req: any) {
    return this.service.create({ ...dto, organizationId: req.user.organizationId });
  }

  @Post('trigger')
  @ApiOperation({ summary: 'Manually trigger a pipeline run' })
  triggerDemo(
    @Body() body: {
      projectId?: string;
      branch?: string;
      author?: string;
      message?: string;
      diff?: string;
    },
    @Request() req: any
  ) {
    if (!body.projectId) {
      throw new BadRequestException('projectId is required');
    }

    return this.service.create({
      projectId: body.projectId,
      organizationId: req.user.organizationId,
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
    @Request() req: any,
    @Query('projectId') projectId?: string,
  ) {
    return this.service.findAll(req.user.organizationId, projectId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get pipeline statistics' })
  getStats(@Request() req: any) {
    return this.service.getStats(req.user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific pipeline run' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.service.findOne(id, req.user.organizationId);
  }
}
