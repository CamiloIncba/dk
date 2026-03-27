import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { AdminOrdersModule } from './admin-orders/admin-orders.module';
import { UploadModule } from './upload/upload.module';
import { ExtrasModule } from './extras/extras.module';
import { CashClosingModule } from './cash-closing/cash-closing.module';
import { StatsModule } from './stats/stats.module';
import { SystemConfigModule } from './config/config.module';
import { ImagesModule } from './images/images.module';
import { StoreModule } from './store/store.module';

@Module({
  imports: [
    PrismaModule,
    MenuModule,
    OrdersModule,
    PaymentsModule,
    KitchenModule,
    ReceiptsModule,
    AdminOrdersModule,
    UploadModule,
    ExtrasModule,
    CashClosingModule,
    StatsModule,
    SystemConfigModule,
    ImagesModule,
    StoreModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
