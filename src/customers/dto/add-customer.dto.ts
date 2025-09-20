import { IsString, IsNumber } from 'class-validator';

export class AddCustomerDto {

  @IsString()
  customerName: string;

  @IsString()
  customerContact: string;

  @IsString()
  customerAddress: string;

  @IsString()
  customerTIN: string;
}
