import { Injectable } from '@nestjs/common';
import { CreateItemDto } from './dto/create-item.dto';

let DEBUG: boolean = true;

export type Items = CreateItemDto & { id: number };

@Injectable()
export class ItemsService {

  private items: Items [] = [
    {
      id: 1,
      itemCode: 'ITEM001',
      itemName: 'Electric Fan',
      brand: 'CoolAir',
      origin: 'Philippines',
      stock: 20,
      originalPrice: 1500,
      netAPrice: 1450,
      netBPrice: 1400,
    },
    {
      id: 2,
      itemCode: 'ITEM002',
      itemName: 'Blender',
      brand: 'MixPro',
      origin: 'China',
      stock: 15,
      originalPrice: 1200,
      netAPrice: 1150,
      netBPrice: 1100,
    },
  ];

  create(item: CreateItemDto): Items {
    const newItem: Items = {
      id: this.items.length + 1,
      ...item,
    };
    this.items.push(newItem);
    return newItem;
  }

  findAll(): Items [] {
    return this.items;
  }

  findOne(id: number) {
    return this.items.find(items => items.id === id);
  }
}
