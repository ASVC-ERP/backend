import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';

export type Order = CreateOrderDto & { id: number };

@Injectable()
export class OrdersService {
  private orders: Order[] = [];

  create(order: CreateOrderDto) {
    const newOrder: Order = {
      id: this.orders.length + 1,
      ...order,
    };
    this.orders.push(newOrder);
    return newOrder;
  }

  findAll() {
    return this.orders;
  }
}
