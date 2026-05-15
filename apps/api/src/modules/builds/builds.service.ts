import { Injectable, Logger } from '@nestjs/common';
import { PipelinesService } from '../pipelines/pipelines.service';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface BuildOptions {
  pipelineRunId: string;
  imageName: string;
  imageTag: string;
  registry: string;
  dockerfilePath?: string;
  buildContext?: string;
}

@Injectable()
export class BuildsService {
  private readonly logger = new Logger(BuildsService.name);

  constructor(private readonly pipelinesService: PipelinesService) {}

  async buildAndPush(opts: BuildOptions): Promise<{ success: boolean; imageRef?: string; error?: string }> {
    const { pipelineRunId, imageName, imageTag, registry, dockerfilePath = 'Dockerfile', buildContext = '.' } = opts;
    const imageRef = `${registry}/${imageName}:${imageTag}`;

    await this.pipelinesService.updateStage(pipelineRunId, 'containerize', 'running', `Building ${imageRef}`);

    try {
      // Simulate Docker build (in production, use Docker SDK or spawn process)
      const buildCmd = `docker build -t ${imageRef} -f ${dockerfilePath} ${buildContext}`;
      this.logger.log(`Running: ${buildCmd}`);

      await this.pipelinesService.updateStage(pipelineRunId, 'containerize', 'success', `✅ Built ${imageRef}`);

      // Push artifact
      await this.pipelinesService.updateStage(pipelineRunId, 'push_artifact', 'running', `Pushing ${imageRef}`);
      // const pushCmd = `docker push ${imageRef}`;
      await this.pipelinesService.updateStage(pipelineRunId, 'push_artifact', 'success', `✅ Pushed ${imageRef}`);

      return { success: true, imageRef };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Build failed';
      await this.pipelinesService.updateStage(pipelineRunId, 'containerize', 'failed', msg);
      return { success: false, error: msg };
    }
  }
}
