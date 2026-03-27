import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  private getBaseUrl(): string {
    const base = process.env.APP_PUBLIC_BASE_URL || 'http://localhost:3010';
    return base.replace(/\/+$/, '');
  }

  private generateCode(): string {
    // Código corto alfanumérico, suficiente para uso interno
    return Math.random().toString(36).substring(2, 10);
  }

  /**
   * Garantiza que la orden tenga un receiptCode y devuelve code + URL pública.
   */
  async getOrCreateReceiptForOrder(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    let receiptCode = order.receiptCode;

    if (!receiptCode) {
      receiptCode = this.generateCode();
      try {
        await this.prisma.order.update({
          where: { id: orderId },
          data: { receiptCode },
        });
      } catch (e) {
        // En caso raro de colisión de unique, releemos
        const updated = await this.prisma.order.findUnique({
          where: { id: orderId },
        });
        receiptCode = updated?.receiptCode ?? receiptCode;
      }
    }

    const url = `${this.getBaseUrl()}/public/receipts/${receiptCode}`;

    return {
      receiptCode,
      receiptUrl: url,
    };
  }

  /**
   * Devuelve datos completos de la orden para impresión de ticket.
   * Incluye items con extras y precios.
   */
  async getOrderPrintData(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
            extras: {
              include: { extraOption: true },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Formato simplificado para la app
    return {
      orderId: order.id,
      total: Number(order.totalAmount),
      status: order.status,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        extras: item.extras.map((e) => ({
          name: e.extraOption.name,
          quantity: e.quantity,
          unitPrice: Number(e.unitPrice),
        })),
      })),
      payment: order.payments[0]
        ? {
            status: order.payments[0].status,
            mpPaymentId: order.payments[0].mpPaymentId,
            paymentType: order.payments[0].paymentType,
            paymentMethod: order.payments[0].paymentMethod,
            isManual: order.payments[0].isManual,
            manualReason: order.payments[0].manualReason,
          }
        : null,
    };
  }

  /**
   * Busca una orden a partir del código de recibo para el endpoint público.
   */
  async getReceiptByCode(code: string) {
    const order = await this.prisma.order.findUnique({
      where: { receiptCode: code },
      include: {
        items: {
          include: { product: true },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Comprobante no encontrado');
    }

    return order;
  }

  /**
   * Construye un HTML simple y prolijo para ver el comprobante en el celu.
   */
  buildHtmlReceipt(order: any): string {
    const storeName = process.env.STORE_NAME || 'Casa Rica';
    const storeAddress = process.env.STORE_ADDRESS || '';
    const createdAt = new Date(order.createdAt).toLocaleString('es-AR');
    const total = order.items.reduce(
      (sum: number, item: any) => sum + Number(item.unitPrice) * item.quantity,
      0,
    );

    const payment = order.payments?.[0];

    const paymentInfoLines: string[] = [];
    if (payment) {
      paymentInfoLines.push(`Estado: ${payment.status}`);
      if (payment.mpPaymentId) paymentInfoLines.push(`Operación MP: ${payment.mpPaymentId}`);
      if (payment.paymentType) paymentInfoLines.push(`Medio: ${payment.paymentType}`);
      if (payment.paymentMethod) paymentInfoLines.push(`Tarjeta / método: ${payment.paymentMethod}`);
      if (payment.payerEmail) paymentInfoLines.push(`Pagador: ${payment.payerEmail}`);
    }

    const itemsHtml = order.items
      .map((item: any) => {
        const lineTotal = Number(item.unitPrice) * item.quantity;
        return `<tr>
  <td>${item.product?.name ?? 'Producto'}</td>
  <td style="text-align:center;">${item.quantity}</td>
  <td style="text-align:right;">$ ${Number(item.unitPrice).toFixed(2)}</td>
  <td style="text-align:right;">$ ${lineTotal.toFixed(2)}</td>
</tr>`;
      })
      .join('\n');

    const paymentInfoHtml = paymentInfoLines
      .map((line) => `<div>${line}</div>`)
      .join('');

    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Comprobante pedido #${order.id}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 16px;
      color: #222;
      background: #f5f5f5;
    }
    .ticket {
      max-width: 480px;
      margin: 0 auto;
      background: #fff;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    h1 {
      font-size: 20px;
      margin: 0 0 4px 0;
    }
    h2 {
      font-size: 16px;
      margin: 16px 0 8px 0;
      border-bottom: 1px solid #ddd;
      padding-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th, td {
      padding: 4px 0;
    }
    th {
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    .total-row td {
      border-top: 1px solid #ddd;
      font-weight: bold;
    }
    .meta {
      font-size: 13px;
      color: #555;
      margin-top: 4px;
    }
    .footer {
      margin-top: 16px;
      font-size: 13px;
      text-align: center;
      color: #777;
    }
    .download-hint {
      margin-top: 8px;
      font-size: 12px;
      color: #777;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="ticket">
    <h1>${storeName}</h1>
    ${storeAddress ? `<div class="meta">${storeAddress}</div>` : ''}
    <div class="meta">Pedido #${order.id}</div>
    <div class="meta">Fecha: ${createdAt}</div>

    <h2>Detalle</h2>
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th style="text-align:center;">Cant.</th>
          <th style="text-align:right;">Precio</th>
          <th style="text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        <tr class="total-row">
          <td colspan="3" style="text-align:right;">Total</td>
          <td style="text-align:right;">$ ${total.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <h2>Pago</h2>
    ${paymentInfoHtml || '<div>No hay información de pago registrada.</div>'}

    <div class="footer">
      Este comprobante no reemplaza el ticket fiscal, si corresponde.<br/>
      Guardá esta página o sacale una captura para conservar tu comprobante.
    </div>
    <div class="download-hint">
      Usá las opciones de compartir / imprimir de tu navegador si querés guardarlo como PDF.
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Genera ticket en texto plano para impresoras térmicas con driver "Generic / Text Only"
   * IMPORTANTE: Solo usa caracteres ASCII basicos (sin acentos ni ñ)
   */
  buildTextReceipt(orderData: {
    orderId: number;
    total: number;
    items: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      extras: Array<{ name: string; quantity: number; unitPrice: number }>;
    }>;
    payment?: { paymentType?: string; paymentMethod?: string; mpPaymentId?: string | null } | null;
  }): string {
    // 28 caracteres es seguro para la mayoria de impresoras termicas 80mm
    const COLS = Number(process.env.PRINTER_COLS) || 28;
    const SEPARATOR = '='.repeat(COLS);
    const LINE = '-'.repeat(COLS);
    const storeName = process.env.STORE_NAME || 'CASA RICA';

    // Eliminar acentos y caracteres especiales
    const stripAccents = (str: string) => {
      return str
        .replace(/[áàäâ]/gi, 'a')
        .replace(/[éèëê]/gi, 'e')
        .replace(/[íìïî]/gi, 'i')
        .replace(/[óòöô]/gi, 'o')
        .replace(/[úùüû]/gi, 'u')
        .replace(/ñ/gi, 'n')
        .replace(/[¡!]/g, '!')
        .replace(/[¿?]/g, '?');
    };

    const center = (text: string) => {
      const clean = stripAccents(text);
      const pad = Math.max(0, Math.floor((COLS - clean.length) / 2));
      return ' '.repeat(pad) + clean;
    };

    // Formato de precio compacto
    const formatPrice = (n: number) => {
      return `$${Math.round(n).toLocaleString('es-AR')}`;
    };

    // Truncar texto si es muy largo
    const truncate = (text: string, maxLen: number) => {
      const clean = stripAccents(text);
      if (clean.length <= maxLen) return clean;
      return clean.substring(0, maxLen - 2) + '..';
    };

    const now = new Date();
    const dateStr = now.toLocaleDateString('es-AR');
    const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    const lines: string[] = [];

    // Header
    lines.push(SEPARATOR);
    lines.push(center(storeName));
    lines.push(center(`${dateStr} ${timeStr}`));
    lines.push(SEPARATOR);

    // *** NUMERO DE PEDIDO MUY GRANDE ***
    // Usando ASCII art para que se vea grande
    lines.push('');
    lines.push(SEPARATOR);
    lines.push(center('PEDIDO'));
    lines.push('');
    // Numero grande con asteriscos
    const orderNum = `#${orderData.orderId}`;
    lines.push(center('*************'));
    lines.push(center(`**  ${orderNum}  **`));
    lines.push(center('*************'));
    lines.push('');
    lines.push(SEPARATOR);
    lines.push('');

    // Items
    for (const item of orderData.items) {
      const itemTotal = item.unitPrice * item.quantity;
      const priceStr = formatPrice(itemTotal);
      const maxNameLen = COLS - priceStr.length - 1;
      const itemLine = truncate(`${item.quantity}x ${item.productName}`, maxNameLen);
      const spaces = Math.max(1, COLS - itemLine.length - priceStr.length);
      lines.push(itemLine + ' '.repeat(spaces) + priceStr);

      // Extras
      for (const extra of item.extras) {
        const extraTotal = extra.unitPrice * extra.quantity * item.quantity;
        if (extraTotal > 0) {
          const extraPriceStr = `+${formatPrice(extraTotal)}`;
          const maxExtraLen = COLS - extraPriceStr.length - 1;
          const extraLine = truncate(` +${extra.name}`, maxExtraLen);
          const extraSpaces = Math.max(1, COLS - extraLine.length - extraPriceStr.length);
          lines.push(extraLine + ' '.repeat(extraSpaces) + extraPriceStr);
        } else {
          lines.push(truncate(` +${extra.name}`, COLS));
        }
      }
    }

    // Total
    lines.push(LINE);
    const totalLabel = 'TOTAL';
    const totalPrice = formatPrice(orderData.total);
    const totalSpaces = Math.max(1, COLS - totalLabel.length - totalPrice.length);
    lines.push(totalLabel + ' '.repeat(totalSpaces) + totalPrice);

    // Payment info
    if (orderData.payment) {
      lines.push(LINE);
      const payMethod = orderData.payment.paymentType || orderData.payment.paymentMethod || '';
      if (payMethod) {
        lines.push(stripAccents(`Pago: ${payMethod}`));
      }
      if (orderData.payment.mpPaymentId) {
        lines.push(`Op.MP: ${orderData.payment.mpPaymentId}`);
      }
    }

    // Footer
    lines.push(LINE);
    lines.push(center('Gracias por su compra!'));
    lines.push(SEPARATOR);

    // Espacios para corte (15 lineas para que salga suficiente papel)
    const feedLines = Number(process.env.PRINTER_FEED_LINES) || 15;
    for (let i = 0; i < feedLines; i++) {
      lines.push('');
    }

    return lines.join('\r\n');
  }

  /**
   * Imprime el ticket directamente a la impresora de Windows usando ESC/POS
   * Envia comandos directos al puerto de la impresora para:
   * - Texto grande para numero de pedido
   * - Auto-corte al final
   */
  async printTicketToWindows(orderId: number): Promise<{ success: boolean; message: string }> {
    const orderData = await this.getOrderPrintData(orderId);

    const fs = await import('fs/promises');
    const path = await import('path');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    const os = await import('os');

    // Construir ticket con comandos ESC/POS
    const escposData = this.buildEscPosTicket(orderData);
    
    const tempFile = path.join(process.env.TEMP || '/tmp', `ticket-${orderId}.bin`);
    const printerShare = process.env.PRINTER_SHARE || 'OCOM';
    const hostname = os.hostname();

    try {
      // Guardar datos binarios ESC/POS
      await fs.writeFile(tempFile, escposData);

      // Enviar directamente al share de la impresora
      // El share debe estar configurado previamente con: Set-Printer -Name "OCOM OCPP-80S" -Shared $true -ShareName "OCOM"
      const sharePath = `\\\\${hostname}\\${printerShare}`;
      await execAsync(`copy /b "${tempFile}" "${sharePath}"`, { shell: 'cmd.exe' });

      await fs.unlink(tempFile).catch(() => {});
      return { success: true, message: `Ticket #${orderId} enviado (ESC/POS)` };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Error al imprimir: ${errorMsg}`,
      };
    }
  }

  /**
   * Construye ticket con comandos ESC/POS para impresora termica
   * Incluye texto grande, negrita y comando de corte automatico
   */
  private buildEscPosTicket(orderData: {
    orderId: number;
    total: number;
    items: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      extras: Array<{ name: string; quantity: number; unitPrice: number }>;
    }>;
    payment?: { 
      paymentType?: string; 
      paymentMethod?: string; 
      mpPaymentId?: string | null;
      isManual?: boolean;
      manualReason?: string | null;
    } | null;
  }): Buffer {
    const commands: number[] = [];
    
    // Comandos ESC/POS
    const ESC = 0x1B;
    const GS = 0x1D;
    const LF = 0x0A;
    
    // Inicializar impresora
    commands.push(ESC, 0x40); // ESC @ - Initialize
    
    // Helpers
    const addText = (text: string) => {
      const ascii = text
        .replace(/[áàäâ]/gi, 'a')
        .replace(/[éèëê]/gi, 'e')
        .replace(/[íìïî]/gi, 'i')
        .replace(/[óòöô]/gi, 'o')
        .replace(/[úùüû]/gi, 'u')
        .replace(/ñ/gi, 'n');
      for (const char of ascii) {
        commands.push(char.charCodeAt(0));
      }
    };
    
    const newLine = () => commands.push(LF);
    const centerOn = () => commands.push(ESC, 0x61, 0x01);
    const centerOff = () => commands.push(ESC, 0x61, 0x00);
    const boldOn = () => commands.push(ESC, 0x45, 0x01);
    const boldOff = () => commands.push(ESC, 0x45, 0x00);
    const doubleOn = () => commands.push(GS, 0x21, 0x11);  // Doble ancho + alto
    const tripleOn = () => commands.push(GS, 0x21, 0x21);  // Triple alto, doble ancho  
    const normalSize = () => commands.push(GS, 0x21, 0x00);
    
    const cutPaper = () => {
      for (let i = 0; i < 4; i++) newLine();
      commands.push(GS, 0x56, 0x41, 0x03);
    };

    const storeName = process.env.STORE_NAME || 'CASA RICA';
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-AR');
    const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const formatPrice = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`;

    // Ancho de 42 caracteres para impresora de 80mm
    const LINE = '==========================================';
    const DASH = '------------------------------------------';

    // === ENCABEZADO ===
    centerOn();
    boldOn();
    addText(storeName);
    newLine();
    boldOff();
    addText(`${dateStr}  ${timeStr}`);
    newLine();
    addText(LINE);
    newLine();
    newLine();

    // === NUMERO DE PEDIDO MUY GRANDE ===
    boldOn();
    addText('PEDIDO');
    newLine();
    tripleOn();
    addText(`#${orderData.orderId}`);
    newLine();
    normalSize();
    boldOff();
    newLine();
    addText(LINE);
    newLine();
    centerOff();

    // === ITEMS ===
    newLine();
    for (const item of orderData.items) {
      const itemTotal = item.unitPrice * item.quantity;
      // Formato: "2x Choripan            $10.000"
      const left = `${item.quantity}x ${item.productName}`;
      const right = formatPrice(itemTotal);
      const spaces = Math.max(1, 42 - left.length - right.length);
      addText(left + ' '.repeat(spaces) + right);
      newLine();

      for (const extra of item.extras) {
        const extraTotal = extra.unitPrice * extra.quantity * item.quantity;
        if (extraTotal > 0) {
          const extraLeft = `  +${extra.name}`;
          const extraRight = `+${formatPrice(extraTotal)}`;
          const extraSpaces = Math.max(1, 42 - extraLeft.length - extraRight.length);
          addText(extraLeft + ' '.repeat(extraSpaces) + extraRight);
        } else {
          addText(`  +${extra.name}`);
        }
        newLine();
      }
    }

    // === TOTAL ===
    addText(DASH);
    newLine();
    centerOn();
    boldOn();
    doubleOn();
    addText(`TOTAL ${formatPrice(orderData.total)}`);
    newLine();
    normalSize();
    boldOff();
    centerOff();

    // === PAGO ===
    if (orderData.payment) {
      newLine();
      
      // Si es pago manual, mostrar claramente
      if (orderData.payment.isManual) {
        boldOn();
        addText('** PAGO APROBADO MANUALMENTE **');
        newLine();
        boldOff();
        
        // Mostrar razón del pago manual
        const reasonLabels: Record<string, string> = {
          MP_VERIFIED: 'Verificado en MP',
          TRANSFER: 'Transferencia',
          CASH: 'Efectivo',
          OTHER_POS: 'Otro POS',
          OTHER: 'Otro',
        };
        const reasonLabel = orderData.payment.manualReason 
          ? reasonLabels[orderData.payment.manualReason] || orderData.payment.manualReason
          : 'Manual';
        addText(`Metodo: ${reasonLabel}`);
        newLine();
      } else {
        // Pago automático de MP
        const payMethod = orderData.payment.paymentType || orderData.payment.paymentMethod || '';
        if (payMethod) {
          addText(`Pago: ${payMethod}`);
          newLine();
        }
        if (orderData.payment.mpPaymentId) {
          addText(`Op.MP: ${orderData.payment.mpPaymentId}`);
          newLine();
        }
      }
    }

    // === FOOTER ===
    newLine();
    centerOn();
    addText(DASH);
    newLine();
    addText('Gracias por su compra!');
    newLine();
    addText(LINE);
    newLine();
    centerOff();

    // === CORTE ===
    cutPaper();

    return Buffer.from(commands);
  }
}
