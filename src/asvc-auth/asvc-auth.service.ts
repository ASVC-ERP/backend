import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../asvc-user/asvc-user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from './refresh-token.service';

interface AccessUser {
  id: number;
  username: string;
  role: string;
  name: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  async validate(username: string, password: string) {
    const user = await this.usersService.read_username(username);
    if (!user) return null;

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return null;

    if (user.active === false) {
      throw new UnauthorizedException('Account is disabled');
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    };
  }

  private signAccessToken(user: AccessUser): string {
    return this.jwtService.sign({
      username: user.username,
      sub: user.id,
      role: user.role,
      name: user.name,
    });
  }

  async login(username: string, password: string) {
    const user = await this.validate(username, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    return {
      access_token: this.signAccessToken(user),
      refresh_token: await this.refreshTokens.issue(user.id),
    };
  }

  async refresh(presentedRefreshToken: string) {
    const { userId, token } = await this.refreshTokens.rotate(presentedRefreshToken);
    const user = await this.usersService.read_one(userId);
    if (!user) throw new UnauthorizedException('User no longer exists');

    return {
      access_token: this.signAccessToken({
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      }),
      refresh_token: token,
    };
  }

  async logout(presentedRefreshToken?: string) {
    if (presentedRefreshToken) {
      await this.refreshTokens.revoke(presentedRefreshToken);
    }
  }
}
