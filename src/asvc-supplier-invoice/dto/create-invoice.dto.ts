import { IsNumber, IsString, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSupplierInvoiceItemDto {
    @IsNumber()
    product_id: number;

    @IsNumber()
    quantity: number;
    
    @IsNumber()
    unit_cost: number;
}

export class CreateSupplierInvoiceDto {
    @IsString()
    invoice_number: string;

    @IsString()
    po_number: string;

    @IsString()
    purchase_date: string;

    @IsNumber()
    supplier_id: number;

    @IsNumber()
    conversion_factor?: number;

    @IsString()
    notes?: string;
  
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateSupplierInvoiceItemDto)
    items: CreateSupplierInvoiceItemDto[];
}