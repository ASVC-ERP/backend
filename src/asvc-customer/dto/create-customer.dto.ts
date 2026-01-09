import { IsOptional, IsString, IsNumber, IsDate, IsNotEmpty } from 'class-validator';

export class CreateCustomerDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  tin?: string;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsString()
  pic?: string;
}
