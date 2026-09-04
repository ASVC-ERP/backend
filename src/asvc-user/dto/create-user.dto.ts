import { IsString, IsOptional, IsIn } from 'class-validator';
import { IsValidPassword } from '../../common/is-valid-password.decorator';

export class CreateUserDto {
  @IsString()
  username: string;

  @IsString()
  name: string;

  @IsValidPassword()
  password: string;

  @IsOptional()
  @IsIn(['admin', 'agent'])
  role?: string;
}
