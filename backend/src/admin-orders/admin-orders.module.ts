import { Module } from '@nestjs/common';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [AdminOrdersController],
  providers: [AdminOrdersService, PrismaService],
  exports: [AdminOrdersService],
})
export class AdminOrdersModule {}
