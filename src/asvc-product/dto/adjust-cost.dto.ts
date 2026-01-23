import { IsNumber } from 'class-validator';

export class AdjustCostDto {
    @IsNumber()
    cost: number;
}
  