import { Module } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { Injectable, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { PipelinesService } from '../pipelines/pipelines.service';
import { AIReviewService } from '../ai-review/ai-review.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);
  private interval: NodeJS.Timeout;

  constructor(
    @Inject(forwardRef(() => PipelinesService))
    private readonly pipelinesService: PipelinesService,
    private readonly aiReviewService: AIReviewService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  onModuleInit() {
    // Broadcast stats every 30 seconds
    this.interval = setInterval(async () => {
      try {
        // Just broadcast stats for 'default-org' for now (or loop active orgs)
        const pipelineStats = await this.pipelinesService.getStats('default-org');
        const aiStats = await this.aiReviewService.getReviewStats('default-org');

        this.server.to('org:default-org').emit('dashboard:stats', { pipelineStats, aiStats });
      } catch (err) {
        this.logger.error(`Failed to broadcast stats: ${err.message}`);
      }
    }, 10000); // 10 seconds for testing, maybe 30s later
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) {
        throw new Error('No token provided');
      }

      const secret = this.configService.get<string>('NEXTAUTH_SECRET') || this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret });

      const orgId = payload.organizationId || payload.org;
      if (orgId) {
        client.join(`org:${orgId}`);
      }

      this.logger.log(`Client connected: ${client.id} (User: ${payload.email}, Org: ${orgId})`);
    } catch (err) {
      this.logger.warn(`Unauthorized client connection attempt: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:pipeline')
  handleSubscribe(@MessageBody() data: { pipelineRunId: string }, client: Socket) {
    client.join(`pipeline:${data.pipelineRunId}`);
    return { event: 'subscribed', data: { room: `pipeline:${data.pipelineRunId}` } };
  }

  emitPipelineUpdate(pipelineRunId: string, payload: unknown) {
    this.server.to(`pipeline:${pipelineRunId}`).emit('pipeline:update', {
      pipelineRunId,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  emitAnomalyAlert(organizationId: string, payload: unknown) {
    this.server.to(`org:${organizationId}`).emit('anomaly:detected', {
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  emitGlobalEvent(organizationId: string, event: string, payload: unknown) {
    this.server.to(`org:${organizationId}`).emit(event, { payload, timestamp: new Date().toISOString() });
  }
}

import { PipelinesModule } from '../pipelines/pipelines.module';
import { AIReviewModule } from '../ai-review/ai-review.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    forwardRef(() => PipelinesModule),
    AIReviewModule,
    JwtModule.register({}),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class GatewayModule { }
