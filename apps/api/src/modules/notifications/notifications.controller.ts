import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post('test')
  @RequirePermission('org:settings')
  @ApiOperation({ summary: 'Send a test notification to Slack' })
  async sendTest(@Body() body: { channel?: string }) {
    return this.service.sendSlack({
      channel: body.channel ?? '#general',
      text: '✅ AI DevOps Platform notification test — everything is working!',
    });
  }
}
