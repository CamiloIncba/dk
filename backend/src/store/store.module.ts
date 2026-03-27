import { Module } from '@nestjs/common';
import { MenuModule } from '../menu/menu.module';
import { OrdersModule } from '../orders/orders.module';
import { StoreController } from './store.controller';

@Module({
  imports: [MenuModule, OrdersModule],
  controllers: [StoreController],
})
export class StoreModule {}
