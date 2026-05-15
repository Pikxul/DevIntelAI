import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AIReviewService } from './ai-review.service';

@ApiTags('ai-review')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('ai-review')
export class AIReviewController {
  constructor(private readonly service: AIReviewService) {}

  @Get()
  @ApiOperation({ summary: 'List recent AI reviews' })
  findAll(@Query('limit') limit?: string) {
    return this.service.findAll(limit ? parseInt(limit) : 20);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get AI review aggregate statistics' })
  getStats() {
    return this.service.getReviewStats();
  }

  @Get('pipeline/:pipelineRunId')
  @ApiOperation({ summary: 'Get AI review for a specific pipeline run' })
  findByPipeline(@Param('pipelineRunId') pipelineRunId: string) {
    return this.service.findByPipelineRun(pipelineRunId);
  }
}
