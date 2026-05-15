import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BuildsService, BuildOptions } from './builds.service';

@ApiTags('builds')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('builds')
export class BuildsController {
  constructor(private readonly service: BuildsService) {}

  @Post()
  @ApiOperation({ summary: 'Trigger a Docker build and push' })
  buildAndPush(@Body() opts: BuildOptions) {
    return this.service.buildAndPush(opts);
  }
}
