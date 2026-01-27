import { IsNumber, IsString, IsOptional } from 'class-validator';
export class AdjustStockDto {
    
    @IsNumber()
    quantity: number;
    
    @IsOptional()
    @IsString()
    pic: string;

    @IsString()
    remarks?: string;
}
  