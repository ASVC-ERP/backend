import { IsString, IsOptional, IsIn, IsBoolean } from 'class-validator';
import { IsValidPassword } from '../../common/is-valid-password.decorator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsValidPassword()
  password?: string;

  @IsOptional()
  @IsIn(['admin', 'agent'])
  role?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  // Admin action from the Users screen: clear a lockout early.
  // Not a column -- consumed and stripped in UsersService.update().
  @IsOptional()
  @IsBoolean()
  unlock?: boolean;
}
