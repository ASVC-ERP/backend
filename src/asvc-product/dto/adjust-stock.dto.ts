import { IsNumber, IsString } from 'class-validator';
export class AdjustStockDto {
    
    @IsNumber()
    quantity: number;
    
    @IsString()
    pic: string;

    @IsString()
    remarks?: string;
}
  