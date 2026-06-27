import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../asvc-user/asvc-user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validate(username: string, password: string) {
    const user = await this.usersService.read_username(username);
    if (!user) return null;

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return null;

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    };
  }

  async login(username: string, password: string) {
    const user = await this.validate(username, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const payload = { username: user.username, sub: user.id, role: user.role, name: user.name };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
