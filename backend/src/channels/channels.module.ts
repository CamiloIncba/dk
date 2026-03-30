import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { MenuModule } from '../menu/menu.module';
import { KitchenModule } from '../kitchen/kitchen.module';
import { PedidosYaController } from './pedidosya/pedidosya.controller';
import { PedidosYaService } from './pedidosya/pedidosya.service';
import { UberEatsController } from './ubereats/ubereats.controller';
import { UberEatsService } from './ubereats/ubereats.service';
import { WhatsAppController } from './whatsapp/whatsapp.controller';
import { WhatsAppService } from './whatsapp/whatsapp.service';

@Module({
  imports: [OrdersModule, MenuModule, KitchenModule],
  controllers: [PedidosYaController, UberEatsController, WhatsAppController],
  providers: [PedidosYaService, UberEatsService, WhatsAppService],
})
export class ChannelsModule {}
