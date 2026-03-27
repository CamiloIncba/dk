import { Module } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuController, AdminMenuController } from './menu.controller';

@Module({
  providers: [MenuService],
  controllers: [MenuController, AdminMenuController],
})
export class MenuModule {}
