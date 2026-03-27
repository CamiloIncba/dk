import { Controller, Get, Post, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  @Get()
  async list(@Query('limit') limit?: string) {
    const take = limit ? Number(limit) : 20;
    return this.ordersService.listRecentOrders(take);
  }

  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getOrderById(id);
  }
}
