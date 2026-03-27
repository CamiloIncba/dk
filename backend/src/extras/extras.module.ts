import { Module } from '@nestjs/common';
import { ExtrasService } from './extras.service';
import { ExtrasController, MenuExtrasController } from './extras.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExtrasController, MenuExtrasController],
  providers: [ExtrasService],
  exports: [ExtrasService],
})
export class ExtrasModule {}
