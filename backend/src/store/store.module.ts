import { Module } from '@nestjs/common';
import { MenuModule } from '../menu/menu.module';
import { OrdersModule } from '../orders/orders.module';
import { ExtrasModule } from '../extras/extras.module';
import { StoreController } from './store.controller';

@Module({
  imports: [MenuModule, OrdersModule, ExtrasModule],
  controllers: [StoreController],
})
export class StoreModule {}
