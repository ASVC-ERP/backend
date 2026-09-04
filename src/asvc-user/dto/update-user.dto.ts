import { IsString, IsOptional, IsIn, IsBoolean, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsIn(['admin', 'agent'])
  role?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
