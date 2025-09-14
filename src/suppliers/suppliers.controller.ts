// src/suppliers/suppliers.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  async getSuppliers() {
    return this.suppliersService.getSuppliers();
  }

  @Post()
  async addSupplier(
    @Body() body: { id: string; name: string; address: string; currency: string },
  ) {
    const { id, name, address, currency } = body;
    return this.suppliersService.addSupplier(id, name, address, currency);
  }

  @Put(':id')
  async updateSupplier(
    @Param('id') supplierId: string,
    @Body() body: { newId?: string; name?: string; address?: string; currency?: string },
  ) {
    return this.suppliersService.updateSupplier(supplierId, body);
  }

  @Delete(':id')
  async deleteSupplier(@Param('id') supplierId: string) {
    return this.suppliersService.deleteSupplier(supplierId);
  }
}
