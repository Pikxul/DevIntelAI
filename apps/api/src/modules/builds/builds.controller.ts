import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BuildsService, BuildOptions } from './builds.service';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';

@ApiTags('builds')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('builds')
export class BuildsController {
  constructor(private readonly service: BuildsService) {}

  @Post()
  @RequirePermission('pipeline:trigger')
  @ApiOperation({ summary: 'Trigger a Docker build and push' })
  buildAndPush(@Body() opts: BuildOptions) {
    return this.service.buildAndPush(opts);
  }
}
