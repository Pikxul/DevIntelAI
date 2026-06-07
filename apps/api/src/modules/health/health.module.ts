import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'pipeline' }),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
