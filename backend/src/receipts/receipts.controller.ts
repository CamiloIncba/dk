import { Controller, Get, Param, ParseIntPipe, Post, Res } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { Response } from 'express';

@Controller()
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  /**
   * Endpoint interno para apps (tótem, cajero, etc.)
   * Devuelve { receiptCode, receiptUrl } para una orden.
   */
  @Get('receipts/order/:id')
  async getReceiptForOrder(@Param('id', ParseIntPipe) id: number) {
    return this.receiptsService.getOrCreateReceiptForOrder(id);
  }

  /**
   * Endpoint para obtener datos completos de una orden para imprimir ticket.
   * Devuelve orden con items y extras.
   */
  @Get('receipts/order/:id/print-data')
  async getOrderPrintData(@Param('id', ParseIntPipe) id: number) {
    return this.receiptsService.getOrderPrintData(id);
  }

  /**
   * Imprime el ticket directamente a la impresora térmica de Windows.
   * Usa el driver "Generic / Text Only" y PowerShell.
   */
  @Post('receipts/order/:id/print')
  async printTicket(@Param('id', ParseIntPipe) id: number) {
    return this.receiptsService.printTicketToWindows(id);
  }

  /**
   * Endpoint público para clientes (se usa desde el QR).
   * Devuelve HTML con el comprobante.
   */
  @Get('public/receipts/:code')
  async getPublicReceipt(
    @Param('code') code: string,
    @Res() res: Response,
  ) {
    const order = await this.receiptsService.getReceiptByCode(code);
    const html = this.receiptsService.buildHtmlReceipt(order);
    res.type('text/html').send(html);
  }
}
