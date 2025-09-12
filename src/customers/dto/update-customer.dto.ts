import { IsOptional, IsString } from 'class-validator';

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerContact?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;
}
