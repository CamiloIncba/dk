import { Controller, Get, Put, Body } from '@nestjs/common';
import { ConfigService, SystemConfig } from './config.service';

@Controller('config')
export class ConfigController {
  constructor(private configService: ConfigService) {}

  @Get()
  async getConfig() {
    return this.configService.getConfig();
  }

  @Put()
  async updateConfig(@Body() updates: Partial<SystemConfig>) {
    return this.configService.updateConfig(updates);
  }
}
