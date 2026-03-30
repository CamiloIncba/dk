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
import { PedidosYaService } from './pedidosya.service';
import { PedidosYaWebhookDto } from './dto/pedidosya-webhook.dto';

@UseGuards(ApiKeyGuard)
@Controller('api/v1/channels/pedidosya')
export class PedidosYaController {
  private readonly logger = new Logger(PedidosYaController.name);

  constructor(private readonly pedidosYaService: PedidosYaService) {}

  /**
   * Webhook endpoint for PedidosYa order events.
   * Configure this URL in the PedidosYa partner portal.
   */
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Body() dto: PedidosYaWebhookDto,
    @Headers('x-pedidosya-signature') signature: string | undefined,
  ) {
    this.logger.log(`Webhook received: event=${dto.event}, id=${dto.id}`);

    if (!this.pedidosYaService.validateSignature(signature, JSON.stringify(dto))) {
      this.logger.warn('Invalid PedidosYa signature');
      return { status: 'rejected', reason: 'invalid_signature' };
    }

    switch (dto.event) {
      case 'ORDER_NEW':
        return this.pedidosYaService.handleNewOrder(dto);
      case 'ORDER_STATE_CHANGE':
        await this.pedidosYaService.handleStateChange(dto);
        return { status: 'ok' };
      case 'ORDER_CANCEL':
        await this.pedidosYaService.handleStateChange(dto);
        return { status: 'ok' };
      default:
        this.logger.log(`Unhandled PedidosYa event: ${dto.event}`);
        return { status: 'ignored', event: dto.event };
    }
  }
}
