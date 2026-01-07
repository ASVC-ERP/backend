import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ValidationPipe,
} from '@nestjs/common';
import { SupplierService } from './asvc-supplier.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Controller('supplier')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  create(@Body(new ValidationPipe({ whitelist: true })) dto: CreateSupplierDto) {
    return this.supplierService.create(dto);
  }

  @Get()
  read() {
    return this.supplierService.read();
  }

  @Get(':id')
  read_one(@Param('id') id: string) {
    return this.supplierService.read_one(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) dto: UpdateSupplierDto,
  ) {
    return this.supplierService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.supplierService.delete(id);
  }
}
