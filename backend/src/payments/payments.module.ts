import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentLinksService } from './payment-links.service';

@Module({
  providers: [PaymentsService, PaymentLinksService],
  controllers: [PaymentsController],
  exports: [PaymentLinksService],
})
export class PaymentsModule {}
