import { IsNumber, IsString, IsOptional } from 'class-validator';
export class AdjustStockDto {
    
    @IsNumber()
    quantity: number;

    @IsNumber()
    pic: number;

    @IsString()
    remarks?: string;
}
  