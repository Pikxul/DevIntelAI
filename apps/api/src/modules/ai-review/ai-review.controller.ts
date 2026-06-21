import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AIReviewService } from './ai-review.service';

@ApiTags('ai-review')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller(['ai-review', 'ai-reviews'])
export class AIReviewController {
  constructor(private readonly service: AIReviewService) {}

  @Get()
  @ApiOperation({ summary: 'List recent AI reviews' })
  findAll(@Request() req: any, @Query('limit') limit?: string) {
    return this.service.findAll(req.user.organizationId, limit ? parseInt(limit) : 20);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get AI review aggregate statistics' })
  getStats(@Request() req: any) {
    return this.service.getReviewStats(req.user.organizationId);
  }

  @Get('pipeline/:pipelineRunId')
  @ApiOperation({ summary: 'Get AI review for a specific pipeline run' })
  findByPipeline(@Param('pipelineRunId') pipelineRunId: string, @Request() req: any) {
    return this.service.findByPipelineRun(pipelineRunId, req.user.organizationId);
  }

  @Post('inline')
  @ApiOperation({ summary: 'Run inline AI review for VS Code' })
  async reviewInline(@Body() dto: { code: string; filename: string }) {
    return this.service.reviewInline(dto.code, dto.filename);
  }

  @Post('commit-message')
  @ApiOperation({ summary: 'Generate commit message from diff' })
  async generateCommitMessage(@Body() dto: { diff: string }) {
    return this.service.generateCommitMessage(dto.diff);
  }

  @Post('pr-summary')
  @ApiOperation({ summary: 'Generate PR summary from diff' })
  async generatePRSummary(@Body() dto: { diff: string; title?: string }) {
    return this.service.summarizePR(dto.diff, dto.title);
  }
}
