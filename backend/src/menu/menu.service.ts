import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async getMenu() {
    const categories = await this.prisma.category.findMany({
      where: { active: true },
      orderBy: { position: 'asc' },
      include: {
        products: {
          where: { active: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    return { categories };
  }

  // === CRUD de Categorías ===
  async getCategories() {
    return this.prisma.category.findMany({
      orderBy: { position: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async createCategory(data: { name: string; position?: number }) {
    return this.prisma.category.create({
      data: {
        name: data.name,
        position: data.position ?? 0,
        active: true,
      },
    });
  }

  async updateCategory(id: number, data: { name?: string; position?: number; active?: boolean }) {
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async deleteCategory(id: number) {
    return this.prisma.category.delete({ where: { id } });
  }

  // === CRUD de Productos ===
  async getProducts() {
    return this.prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: { category: true },
    });
  }

  async createProduct(data: { 
    name: string; 
    price: number; 
    categoryId: number;
    description?: string;
    imageUrl?: string;
  }) {
    return this.prisma.product.create({
      data: {
        name: data.name,
        price: data.price,
        categoryId: data.categoryId,
        description: data.description,
        imageUrl: data.imageUrl,
        active: true,
      },
      include: { category: true },
    });
  }

  async updateProduct(id: number, data: { 
    name?: string; 
    price?: number; 
    categoryId?: number;
    description?: string;
    imageUrl?: string;
    active?: boolean;
  }) {
    return this.prisma.product.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async deleteProduct(id: number) {
    return this.prisma.product.delete({ where: { id } });
  }
}
