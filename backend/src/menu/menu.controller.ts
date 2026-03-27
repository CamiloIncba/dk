import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { MenuService } from './menu.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  async getMenu() {
    return this.menuService.getMenu();
  }
}

// Controller separado para admin con API Key
@Controller('admin/menu')
@UseGuards(ApiKeyGuard)
export class AdminMenuController {
  constructor(private readonly menuService: MenuService) {}

  // === Categorías ===
  @Get('categories')
  async getCategories() {
    return this.menuService.getCategories();
  }

  @Post('categories')
  async createCategory(@Body() body: { name: string; position?: number }) {
    return this.menuService.createCategory(body);
  }

  @Patch('categories/:id')
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; position?: number; active?: boolean },
  ) {
    return this.menuService.updateCategory(id, body);
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.deleteCategory(id);
  }

  // === Productos ===
  @Get('products')
  async getProducts() {
    return this.menuService.getProducts();
  }

  @Post('products')
  async createProduct(@Body() body: { 
    name: string; 
    price: number; 
    categoryId: number;
    description?: string;
    imageUrl?: string;
  }) {
    return this.menuService.createProduct(body);
  }

  @Patch('products/:id')
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { 
      name?: string; 
      price?: number; 
      categoryId?: number;
      description?: string;
      imageUrl?: string;
      active?: boolean;
    },
  ) {
    return this.menuService.updateProduct(id, body);
  }

  @Delete('products/:id')
  async deleteProduct(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.deleteProduct(id);
  }
}
