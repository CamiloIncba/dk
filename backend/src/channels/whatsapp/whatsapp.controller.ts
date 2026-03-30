import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppWebhookDto } from './dto/whatsapp-webhook.dto';

@Controller('api/v1/channels/whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(private readonly whatsAppService: WhatsAppService) {}

  /**
   * Meta webhook verification (GET challenge).
   * Configure this URL in Meta for Developers → WhatsApp → Webhook.
   */
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const result = this.whatsAppService.verifyWebhook(mode, token, challenge);
    if (result) {
      return res.status(200).send(result);
    }
    return res.status(403).send('Forbidden');
  }

  /**
   * Incoming message webhook (POST).
   * Meta sends message events here.
   */
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Body() dto: WhatsAppWebhookDto) {
    this.logger.log(`WhatsApp webhook: ${dto.entry?.length ?? 0} entries`);
    await this.whatsAppService.processWebhook(dto);
    return { status: 'ok' };
  }
}
