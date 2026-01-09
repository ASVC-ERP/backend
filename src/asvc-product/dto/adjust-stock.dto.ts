import { IsNumber, IsString } from 'class-validator';
export class AdjustStockDto {
    
    @IsNumber()
    quantity: number; // positive or negative
    
    @IsString()
    reason?: string;  // optional audit reason
}
  