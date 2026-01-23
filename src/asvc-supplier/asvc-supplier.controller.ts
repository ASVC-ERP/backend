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
  constructor(private readonly service: SupplierService) {}

  @Post()
  create(@Body(new ValidationPipe({ whitelist: true })) dto: CreateSupplierDto) {
    return this.service.create(dto);
  }

  @Get()
  read() {
    return this.service.read();
  }

  @Get(':id')
  read_one(@Param('id') id: string) {
    return this.service.read_one(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) dto: UpdateSupplierDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
