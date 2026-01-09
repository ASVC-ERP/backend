import { IsNumber, IsString } from 'class-validator';

export class AdjustPriceDto {
    @IsNumber()
    price4: number;
}
  