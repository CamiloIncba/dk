import { Module } from '@nestjs/common';
import { CashClosingController } from './cash-closing.controller';
import { CashClosingService } from './cash-closing.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [CashClosingController],
  providers: [CashClosingService, PrismaService],
  exports: [CashClosingService],
})
export class CashClosingModule {}
