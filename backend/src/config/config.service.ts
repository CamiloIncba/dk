import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SystemConfig {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  taxId: string; // RFC en México
  receiptFooter: string;
  currency: string;
  taxRate: number; // IVA u otro impuesto (16% = 0.16)
  enableSound: boolean;
  enableVibration: boolean;
  kitchenAutoRefresh: number; // segundos
  orderTimeout: number; // minutos para marcar orden como expirada
  printAutomatically: boolean;
  mpPublicKey: string;
  mpAccessToken: string;
}

const DEFAULT_CONFIG: SystemConfig = {
  businessName: 'Mi Negocio',
  businessAddress: '',
  businessPhone: '',
  taxId: '',
  receiptFooter: '¡Gracias por su compra!',
  currency: 'MXN',
  taxRate: 0.16,
  enableSound: true,
  enableVibration: true,
  kitchenAutoRefresh: 5,
  orderTimeout: 30,
  printAutomatically: false,
  mpPublicKey: '',
  mpAccessToken: '',
};

@Injectable()
export class ConfigService {
  constructor(private prisma: PrismaService) {}

  async getConfig(): Promise<SystemConfig> {
    const configs = await this.prisma.systemConfig.findMany();
    
    const result: SystemConfig = { ...DEFAULT_CONFIG };
    
    for (const config of configs) {
      if (config.key in result) {
        const value = config.value;
        // Parsear tipos según la clave
        if (['enableSound', 'enableVibration', 'printAutomatically'].includes(config.key)) {
          (result as any)[config.key] = value === 'true';
        } else if (['taxRate', 'kitchenAutoRefresh', 'orderTimeout'].includes(config.key)) {
          (result as any)[config.key] = parseFloat(value) || DEFAULT_CONFIG[config.key as keyof SystemConfig];
        } else {
          (result as any)[config.key] = value;
        }
      }
    }
    
    return result;
  }

  async updateConfig(updates: Partial<SystemConfig>): Promise<SystemConfig> {
    for (const [key, value] of Object.entries(updates)) {
      if (key in DEFAULT_CONFIG) {
        await this.prisma.systemConfig.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
      }
    }
    
    return this.getConfig();
  }

  async getValue(key: keyof SystemConfig): Promise<string | null> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });
    return config?.value ?? null;
  }
}
