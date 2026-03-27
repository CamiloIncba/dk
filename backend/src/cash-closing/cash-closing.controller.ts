import { Controller, Get, Query } from '@nestjs/common';
import { CashClosingService } from './cash-closing.service';

@Controller('cash-closing')
export class CashClosingController {
  constructor(private readonly cashClosingService: CashClosingService) {}

  /**
   * GET /cash-closing/today
   * Obtiene el resumen del día de hoy
   */
  @Get('today')
  async getTodaySummary() {
    return this.cashClosingService.getTodaySummary();
  }

  /**
   * GET /cash-closing/summary?dateFrom=2024-01-01&dateTo=2024-01-31
   * Obtiene el resumen para un rango de fechas
   * 
   * Las fechas se interpretan como fechas locales (Argentina UTC-3)
   */
  @Get('summary')
  async getSummary(
    @Query('dateFrom') dateFromStr: string,
    @Query('dateTo') dateToStr: string,
  ) {
    // Parsear como fecha local (YYYY-MM-DD)
    // Agregamos T00:00:00 para que se interprete como local, no UTC
    const dateFrom = dateFromStr 
      ? this.parseLocalDate(dateFromStr, 0, 0, 0, 0)
      : this.getTodayStart();

    const dateTo = dateToStr 
      ? this.parseLocalDate(dateToStr, 23, 59, 59, 999)
      : this.getTodayEnd();

    return this.cashClosingService.generateSummary(dateFrom, dateTo);
  }

  /**
   * Parsea una fecha string (YYYY-MM-DD) como fecha local con hora específica
   */
  private parseLocalDate(dateStr: string, hours: number, minutes: number, seconds: number, ms: number): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day, hours, minutes, seconds, ms);
    return date;
  }

  private getTodayStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }

  private getTodayEnd(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }
}
