import { Injectable, Logger } from '@nestjs/common';
import { OrderChannel } from '@prisma/client';
import { OrdersService } from '../../orders/orders.service';
import { MenuService } from '../../menu/menu.service';
import type {
  WhatsAppMessage,
  WhatsAppWebhookDto,
} from './dto/whatsapp-webhook.dto';

/**
 * Conversation states for the WhatsApp chatbot flow.
 */
export type ConversationState =
  | 'IDLE'
  | 'BROWSING_MENU'
  | 'BUILDING_ORDER'
  | 'CONFIRMING'
  | 'AWAITING_ADDRESS'
  | 'AWAITING_PAYMENT'
  | 'COMPLETED';

interface ConversationContext {
  state: ConversationState;
  customerName: string;
  phone: string;
  items: Array<{ productId: number; productName: string; quantity: number }>;
  address?: string;
  lastActivity: number;
}

const CONVERSATION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly conversations = new Map<string, ConversationContext>();

  constructor(
    private readonly ordersService: OrdersService,
    private readonly menuService: MenuService,
  ) {}

  /**
   * Verifies the webhook token for Meta's challenge request.
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('WhatsApp webhook verified');
      return challenge;
    }
    return null;
  }

  async processWebhook(dto: WhatsAppWebhookDto) {
    for (const entry of dto.entry) {
      for (const change of entry.changes) {
        const messages = change.value.messages ?? [];
        const contacts = change.value.contacts ?? [];

        for (const msg of messages) {
          const contactName =
            contacts.find((c) => c.wa_id === msg.from)?.profile?.name ?? 'Cliente';
          await this.handleMessage(msg, contactName);
        }
      }
    }
  }

  private async handleMessage(msg: WhatsAppMessage, contactName: string) {
    const phone = msg.from;
    this.cleanExpired();

    let ctx = this.conversations.get(phone);
    if (!ctx) {
      ctx = {
        state: 'IDLE',
        customerName: contactName,
        phone,
        items: [],
        lastActivity: Date.now(),
      };
      this.conversations.set(phone, ctx);
    }
    ctx.lastActivity = Date.now();

    const text = (msg.text?.body ?? '').trim().toLowerCase();

    switch (ctx.state) {
      case 'IDLE':
        await this.handleIdle(ctx, text);
        break;
      case 'BROWSING_MENU':
        await this.handleBrowsingMenu(ctx, text);
        break;
      case 'BUILDING_ORDER':
        await this.handleBuildingOrder(ctx, text);
        break;
      case 'AWAITING_ADDRESS':
        await this.handleAwaitingAddress(ctx, msg.text?.body ?? '');
        break;
      case 'CONFIRMING':
        await this.handleConfirming(ctx, text);
        break;
      default:
        await this.sendMessage(phone, this.getWelcomeMessage());
        ctx.state = 'IDLE';
    }
  }

  private async handleIdle(ctx: ConversationContext, text: string) {
    if (text.includes('menu') || text.includes('carta') || text.includes('pedir') || text.includes('hola')) {
      const menu = await this.menuService.getMenu();
      const lines = ['🍕 *Stone Fungus — Carta*\n'];
      let idx = 1;
      for (const cat of menu.categories) {
        for (const p of cat.products) {
          lines.push(`${idx}. *${p.name}* — $${Number(p.price).toLocaleString('es-CL')}`);
          if (p.description) lines.push(`   _${p.description}_`);
          idx++;
        }
      }
      lines.push('\nEnviá el *número* del producto para agregar. Escribí *listo* cuando termines.');
      await this.sendMessage(ctx.phone, lines.join('\n'));
      ctx.state = 'BROWSING_MENU';
    } else {
      await this.sendMessage(ctx.phone, this.getWelcomeMessage());
    }
  }

  private async handleBrowsingMenu(ctx: ConversationContext, text: string) {
    if (text === 'listo' || text === 'confirmar') {
      if (ctx.items.length === 0) {
        await this.sendMessage(ctx.phone, 'Tu pedido está vacío. Enviá un número para agregar un producto.');
        return;
      }
      await this.sendMessage(ctx.phone, '📍 Enviá tu *dirección de entrega*:');
      ctx.state = 'AWAITING_ADDRESS';
      return;
    }

    const num = parseInt(text, 10);
    if (!isNaN(num) && num > 0) {
      const menu = await this.menuService.getMenu();
      const allProducts = menu.categories.flatMap((c) => c.products);
      const product = allProducts[num - 1];
      if (product) {
        const existing = ctx.items.find((i) => i.productId === product.id);
        if (existing) {
          existing.quantity++;
        } else {
          ctx.items.push({ productId: product.id, productName: product.name, quantity: 1 });
        }
        const summary = ctx.items.map((i) => `  ${i.quantity}× ${i.productName}`).join('\n');
        await this.sendMessage(ctx.phone, `✅ *${product.name}* agregada.\n\nTu pedido:\n${summary}\n\nAgregá más o escribí *listo*.`);
        ctx.state = 'BUILDING_ORDER';
      } else {
        await this.sendMessage(ctx.phone, 'Número no válido. Intentá de nuevo.');
      }
    } else {
      await this.sendMessage(ctx.phone, 'Enviá el *número* de la pizza o escribí *listo*.');
    }
  }

  private async handleBuildingOrder(ctx: ConversationContext, text: string) {
    await this.handleBrowsingMenu(ctx, text);
  }

  private async handleAwaitingAddress(ctx: ConversationContext, rawText: string) {
    const address = rawText.trim();
    if (address.length < 5) {
      await this.sendMessage(ctx.phone, 'Dirección muy corta. Incluí calle, número y comuna.');
      return;
    }
    ctx.address = address;

    const summary = ctx.items.map((i) => `  ${i.quantity}× ${i.productName}`).join('\n');
    await this.sendMessage(
      ctx.phone,
      `📋 *Resumen de pedido*\n\n${summary}\n\n📍 ${ctx.address}\n💳 Pago: transferencia\n\n¿Confirmás? Respondé *sí* o *cancelar*.`,
    );
    ctx.state = 'CONFIRMING';
  }

  private async handleConfirming(ctx: ConversationContext, text: string) {
    if (text === 'si' || text === 'sí' || text === 'confirmar' || text === 'ok') {
      try {
        const order = await this.ordersService.createOrder({
          items: ctx.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            extras: [],
          })),
          note: [
            '[CHANNEL:WHATSAPP]',
            `Cliente: ${ctx.customerName}`,
            `Tel: ${ctx.phone}`,
            `Dir: ${ctx.address}`,
            'Pago: transferencia',
          ].join(' | '),
          channel: OrderChannel.WHATSAPP,
        });

        await this.sendMessage(
          ctx.phone,
          `🎉 *Pedido #${order.id} confirmado!*\n\nTe contactaremos para coordinar el pago y la entrega.\n\nGracias por elegir Stone Fungus 🍄`,
        );
        this.conversations.delete(ctx.phone);
      } catch (err) {
        this.logger.error('Error creating WhatsApp order', err);
        await this.sendMessage(ctx.phone, '❌ Hubo un error al crear tu pedido. Intentá de nuevo más tarde.');
        this.conversations.delete(ctx.phone);
      }
    } else if (text === 'cancelar' || text === 'no') {
      await this.sendMessage(ctx.phone, 'Pedido cancelado. Escribí *hola* para empezar de nuevo.');
      this.conversations.delete(ctx.phone);
    } else {
      await this.sendMessage(ctx.phone, 'Respondé *sí* para confirmar o *cancelar* para anular.');
    }
  }

  /**
   * Sends a WhatsApp message via the Cloud API.
   * Requires WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.
   */
  async sendMessage(to: string, body: string) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      this.logger.warn(`[DRY RUN] → ${to}: ${body.substring(0, 80)}...`);
      return;
    }

    try {
      const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body },
        }),
      });

      if (!res.ok) {
        this.logger.error(`WhatsApp API error: ${res.status} ${await res.text()}`);
      }
    } catch (err) {
      this.logger.error('Failed to send WhatsApp message', err);
    }
  }

  private getWelcomeMessage(): string {
    return [
      '🍄 *Bienvenido a Stone Fungus!*',
      'El primer restaurante de hongos gourmet en Chile.',
      '',
      'Escribí *menu* para ver nuestra carta y hacer tu pedido.',
    ].join('\n');
  }

  private cleanExpired() {
    const now = Date.now();
    for (const [phone, ctx] of this.conversations) {
      if (now - ctx.lastActivity > CONVERSATION_TIMEOUT_MS) {
        this.conversations.delete(phone);
      }
    }
  }
}
