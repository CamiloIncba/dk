import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExtrasService {
  constructor(private prisma: PrismaService) {}

  // ==================== GRUPOS DE EXTRAS ====================

  async getAllGroups() {
    return this.prisma.extraGroup.findMany({
      where: { active: true, paused: false },
      include: {
        options: {
          where: { active: true, paused: false },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    });
  }

  async getAllGroupsAdmin() {
    return this.prisma.extraGroup.findMany({
      include: {
        options: {
          orderBy: { position: 'asc' },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { position: 'asc' },
    });
  }

  async getGroupById(id: number) {
    const group = await this.prisma.extraGroup.findUnique({
      where: { id },
      include: {
        options: {
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!group) throw new NotFoundException('Grupo no encontrado');
    return group;
  }

  async createGroup(data: {
    name: string;
    description?: string;
    minSelections?: number;
    maxSelections?: number;
    position?: number;
  }) {
    // Obtener la posición máxima actual
    const maxPos = await this.prisma.extraGroup.aggregate({
      _max: { position: true },
    });
    const position = data.position ?? (maxPos._max.position ?? 0) + 1;

    return this.prisma.extraGroup.create({
      data: {
        name: data.name,
        description: data.description,
        minSelections: data.minSelections ?? 0,
        maxSelections: data.maxSelections,
        position,
      },
      include: { options: true },
    });
  }

  async updateGroup(
    id: number,
    data: {
      name?: string;
      description?: string;
      minSelections?: number;
      maxSelections?: number | null;
      position?: number;
      active?: boolean;
    },
  ) {
    await this.getGroupById(id); // Verifica que existe
    return this.prisma.extraGroup.update({
      where: { id },
      data,
      include: { options: true },
    });
  }

  async deleteGroup(id: number) {
    await this.getGroupById(id);
    // Soft delete
    return this.prisma.extraGroup.update({
      where: { id },
      data: { active: false },
    });
  }

  async toggleGroupPause(id: number) {
    const group = await this.getGroupById(id);
    return this.prisma.extraGroup.update({
      where: { id },
      data: { paused: !group.paused },
      include: { options: true },
    });
  }

  // ==================== OPCIONES DE EXTRAS ====================

  async createOption(
    groupId: number,
    data: {
      name: string;
      price?: number;
      imageUrl?: string;
      position?: number;
    },
  ) {
    await this.getGroupById(groupId); // Verifica que el grupo existe

    // Obtener posición máxima en este grupo
    const maxPos = await this.prisma.extraOption.aggregate({
      where: { groupId },
      _max: { position: true },
    });
    const position = data.position ?? (maxPos._max.position ?? 0) + 1;

    return this.prisma.extraOption.create({
      data: {
        name: data.name,
        price: data.price ?? 0,
        imageUrl: data.imageUrl,
        position,
        groupId,
      },
    });
  }

  async updateOption(
    id: number,
    data: {
      name?: string;
      price?: number;
      imageUrl?: string;
      position?: number;
      active?: boolean;
    },
  ) {
    const option = await this.prisma.extraOption.findUnique({ where: { id } });
    if (!option) throw new NotFoundException('Opción no encontrada');

    return this.prisma.extraOption.update({
      where: { id },
      data,
    });
  }

  async deleteOption(id: number) {
    const option = await this.prisma.extraOption.findUnique({ where: { id } });
    if (!option) throw new NotFoundException('Opción no encontrada');

    // Soft delete
    return this.prisma.extraOption.update({
      where: { id },
      data: { active: false },
    });
  }

  async toggleOptionPause(id: number) {
    const option = await this.prisma.extraOption.findUnique({ where: { id } });
    if (!option) throw new NotFoundException('Opción no encontrada');

    return this.prisma.extraOption.update({
      where: { id },
      data: { paused: !option.paused },
    });
  }

  // ==================== PRODUCTOS ↔ GRUPOS ====================

  async getProductExtras(productId: number) {
    const productExtras = await this.prisma.productExtraGroup.findMany({
      where: { 
        productId,
        group: { active: true, paused: false },
      },
      include: {
        group: {
          include: {
            options: {
              where: { active: true, paused: false },
              orderBy: { position: 'asc' },
            },
          },
        },
        customOptions: {
          include: {
            option: true,
          },
        },
      },
      orderBy: { position: 'asc' },
    });
    
    // Filtrar opciones pausadas de customOptions también
    return productExtras.map(pe => ({
      ...pe,
      customOptions: pe.customOptions.filter(co => co.option.active && !co.option.paused),
    }));
  }

  async setProductExtras(
    productId: number,
    groups: {
      groupId: number;
      maxSelections?: number | null;
      customOptions?: { optionId: number; priceOverride?: number | null }[];
    }[],
  ) {
    // Eliminar relaciones existentes (esto también elimina customOptions por cascade)
    await this.prisma.productExtraGroup.deleteMany({
      where: { productId },
    });

    // Crear nuevas relaciones con maxSelections y opciones personalizadas
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      
      const productExtraGroup = await this.prisma.productExtraGroup.create({
        data: {
          productId,
          groupId: g.groupId,
          position: i,
          maxSelections: g.maxSelections ?? null,
        },
      });

      // Si hay opciones personalizadas, crearlas
      if (g.customOptions && g.customOptions.length > 0) {
        await this.prisma.productExtraOption.createMany({
          data: g.customOptions.map((opt) => ({
            productExtraGroupId: productExtraGroup.id,
            optionId: opt.optionId,
            priceOverride: opt.priceOverride ?? null,
          })),
        });
      }
    }

    return this.getProductExtras(productId);
  }

  async addGroupToProduct(productId: number, groupId: number) {
    // Verificar que no existe ya
    const exists = await this.prisma.productExtraGroup.findUnique({
      where: { productId_groupId: { productId, groupId } },
    });
    if (exists) return exists;

    // Obtener posición máxima
    const maxPos = await this.prisma.productExtraGroup.aggregate({
      where: { productId },
      _max: { position: true },
    });

    return this.prisma.productExtraGroup.create({
      data: {
        productId,
        groupId,
        position: (maxPos._max.position ?? 0) + 1,
      },
    });
  }

  async removeGroupFromProduct(productId: number, groupId: number) {
    return this.prisma.productExtraGroup.deleteMany({
      where: { productId, groupId },
    });
  }
}
