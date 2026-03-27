import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ExtrasService } from './extras.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

// DTO para grupos
class CreateGroupDto {
  name: string;
  description?: string;
  minSelections?: number;
  maxSelections?: number;
  position?: number;
}

class UpdateGroupDto {
  name?: string;
  description?: string;
  minSelections?: number;
  maxSelections?: number | null;
  position?: number;
  active?: boolean;
}

// DTO para opciones
class CreateOptionDto {
  name: string;
  price?: number;
  imageUrl?: string;
  position?: number;
}

class UpdateOptionDto {
  name?: string;
  price?: number;
  imageUrl?: string;
  position?: number;
  active?: boolean;
}

// DTO para opciones personalizadas por producto
class CustomOptionDto {
  optionId: number;
  priceOverride?: number | null; // null = precio default, 0 = gratis, otro = ese precio
}

// DTO para vincular productos (con maxSelections y opciones personalizadas)
class ProductExtraGroupDto {
  groupId: number;
  maxSelections?: number | null;
  customOptions?: CustomOptionDto[]; // Si está vacío/undefined, todas las opciones del grupo aplican
}

class SetProductExtrasDto {
  groups: ProductExtraGroupDto[];
}

@Controller('admin/extras')
@UseGuards(ApiKeyGuard)
export class ExtrasController {
  constructor(private readonly extrasService: ExtrasService) {}

  // ==================== GRUPOS ====================

  @Get('groups')
  getAllGroups() {
    return this.extrasService.getAllGroupsAdmin();
  }

  @Get('groups/:id')
  getGroup(@Param('id', ParseIntPipe) id: number) {
    return this.extrasService.getGroupById(id);
  }

  @Post('groups')
  createGroup(@Body() dto: CreateGroupDto) {
    return this.extrasService.createGroup(dto);
  }

  @Patch('groups/:id')
  updateGroup(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.extrasService.updateGroup(id, dto);
  }

  @Delete('groups/:id')
  deleteGroup(@Param('id', ParseIntPipe) id: number) {
    return this.extrasService.deleteGroup(id);
  }

  @Patch('groups/:id/pause')
  toggleGroupPause(@Param('id', ParseIntPipe) id: number) {
    return this.extrasService.toggleGroupPause(id);
  }

  // ==================== OPCIONES ====================

  @Post('groups/:groupId/options')
  createOption(
    @Param('groupId', ParseIntPipe) groupId: number,
    @Body() dto: CreateOptionDto,
  ) {
    return this.extrasService.createOption(groupId, dto);
  }

  @Patch('options/:id')
  updateOption(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOptionDto,
  ) {
    return this.extrasService.updateOption(id, dto);
  }

  @Delete('options/:id')
  deleteOption(@Param('id', ParseIntPipe) id: number) {
    return this.extrasService.deleteOption(id);
  }

  @Patch('options/:id/pause')
  toggleOptionPause(@Param('id', ParseIntPipe) id: number) {
    return this.extrasService.toggleOptionPause(id);
  }

  // ==================== PRODUCTOS ↔ GRUPOS ====================

  @Get('products/:productId')
  getProductExtras(@Param('productId', ParseIntPipe) productId: number) {
    return this.extrasService.getProductExtras(productId);
  }

  @Post('products/:productId')
  setProductExtras(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: SetProductExtrasDto,
  ) {
    return this.extrasService.setProductExtras(productId, dto.groups);
  }

  @Post('products/:productId/groups/:groupId')
  addGroupToProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    return this.extrasService.addGroupToProduct(productId, groupId);
  }

  @Delete('products/:productId/groups/:groupId')
  removeGroupFromProduct(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('groupId', ParseIntPipe) groupId: number,
  ) {
    return this.extrasService.removeGroupFromProduct(productId, groupId);
  }
}

// Controlador público (sin auth) para obtener extras de un producto
@Controller('menu')
export class MenuExtrasController {
  constructor(private readonly extrasService: ExtrasService) {}

  @Get('products/:productId/extras')
  getProductExtras(@Param('productId', ParseIntPipe) productId: number) {
    return this.extrasService.getProductExtras(productId);
  }
}
