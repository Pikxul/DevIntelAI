import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Trigger a new pipeline run' })
  create(@Body() dto: CreatePipelineRunDto) {
    return this.service.create(dto);
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
