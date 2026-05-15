import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post('test')
  async sendTest(@Body() body: { channel?: string }) {
    return this.service.sendSlack({
      channel: body.channel ?? '#general',
      text: '✅ AI DevOps Platform notification test — everything is working!',
    });
  }
}
