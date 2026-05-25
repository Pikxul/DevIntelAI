/**
 * AIReviewProcessor — DEPRECATED.
 * 
 * The 'pipeline' queue processing has been moved to PipelineProcessor in the PipelinesModule.
 * This file is kept but the queue listener is deactivated to avoid duplicate processing.
 * 
 * AIReviewService is now called directly from PipelineProcessor.
 */
import { Logger } from '@nestjs/common';

export class AIReviewProcessor {
  private readonly logger = new Logger(AIReviewProcessor.name);
  // No longer a @Processor — PipelineProcessor handles all pipeline queue jobs.
}
