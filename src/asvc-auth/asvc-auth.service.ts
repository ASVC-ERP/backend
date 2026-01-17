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
    const users = await this.usersService.read();
    const user = users.find(u => u.username === username);
    if (!user) return null;

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return null;

    return user;
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
