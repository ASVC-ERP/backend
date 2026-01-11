import {
    IsArray,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    ValidateNested
  } from 'class-validator';
import { Type } from 'class-transformer';
  
class UpdateSupplierInvoiceItemDto {
    @IsNumber()
    product_id: number;
  
    @IsNumber()
    quantity: number;
  
    @IsString()
    unit?: string;
  
    @IsNumber()
    unit_cost: number;
  }
  
  export class UpdateSupplierInvoiceDto {
    @IsOptional()
    @IsString()
    invoice_number?: string;
    
    @IsOptional()
    @IsString()
    po_number?: string;
  
    @IsOptional()
    @IsString()
    purchase_date?: string;
  
    @IsOptional()
    @IsNumber()
    supplier_id?: number;
  
    @IsOptional()
    @IsNumber()
    conversion_factor?: number;
  
    // REQUIRED – same as sales order
    @IsArray()
    @IsNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => UpdateSupplierInvoiceItemDto)
    items: UpdateSupplierInvoiceItemDto[];
  }
  