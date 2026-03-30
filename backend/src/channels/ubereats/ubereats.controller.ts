import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { UberEatsService } from './ubereats.service';
import { UberEatsWebhookDto } from './dto/ubereats-webhook.dto';

@UseGuards(ApiKeyGuard)
@Controller('api/v1/channels/ubereats')
export class UberEatsController {
  private readonly logger = new Logger(UberEatsController.name);

  constructor(private readonly uberEatsService: UberEatsService) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Body() dto: UberEatsWebhookDto,
    @Headers('x-uber-signature') signature: string | undefined,
  ) {
    this.logger.log(`Webhook received: type=${dto.event_type}, id=${dto.event_id}`);

    if (!this.uberEatsService.validateSignature(signature, JSON.stringify(dto))) {
      this.logger.warn('Invalid Uber Eats signature');
      return { status: 'rejected', reason: 'invalid_signature' };
    }

    switch (dto.event_type) {
      case 'orders.notification':
        return this.uberEatsService.handleOrderNotification(dto);
      case 'orders.cancel':
        await this.uberEatsService.handleCancel(dto);
        return { status: 'ok' };
      default:
        this.logger.log(`Unhandled Uber Eats event: ${dto.event_type}`);
        return { status: 'ignored', event_type: dto.event_type };
    }
  }
}
