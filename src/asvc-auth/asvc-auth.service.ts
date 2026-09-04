import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../asvc-user/asvc-user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from './refresh-token.service';
import { AuditService } from '../audit/audit.service';

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
    private readonly audit: AuditService,
  ) {}

  async validate(username: string, password: string, ip?: string) {
    const user = await this.usersService.read_username(username);
    if (!user) {
      await this.audit.record({
        action: 'login.failure',
        actorUsername: username,
        meta: { reason: 'unknown_user' },
        ip,
      });
      return null;
    }

    // Locked account: refuse before checking the password so a lockout
    // can't be probed or extended by continued guessing.
    if (
      user.locked_until &&
      new Date(user.locked_until).getTime() > Date.now()
    ) {
      await this.audit.record({
        action: 'login.failure',
        actorId: user.id,
        actorUsername: user.username,
        meta: { reason: 'account_locked' },
        ip,
      });
      throw new UnauthorizedException(
        'Account temporarily locked after too many failed attempts. Try again in a few minutes.',
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      // Best-effort: a failure to record this never changes the outcome.
      const { locked } = await this.usersService.registerFailedLogin(
        user.id,
        user.failed_login_attempts ?? 0,
      );
      await this.audit.record({
        action: 'login.failure',
        actorId: user.id,
        actorUsername: user.username,
        meta: { reason: 'bad_password' },
        ip,
      });
      if (locked) {
        await this.audit.record({
          action: 'login.locked',
          actorId: user.id,
          actorUsername: user.username,
          summary: 'Locked for 15 minutes after 5 consecutive failed logins',
          ip,
        });
      }
      return null;
    }

    if (user.active === false) {
      await this.audit.record({
        action: 'login.failure',
        actorId: user.id,
        actorUsername: user.username,
        meta: { reason: 'account_disabled' },
        ip,
      });
      throw new UnauthorizedException('Account is disabled');
    }

    // Successful auth wipes any prior failure state.
    if ((user.failed_login_attempts ?? 0) > 0 || user.locked_until) {
      await this.usersService.clearLoginFailures(user.id);
    }

    await this.audit.record({
      action: 'login.success',
      actorId: user.id,
      actorUsername: user.username,
      ip,
    });

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

  async login(username: string, password: string, ip?: string) {
    const user = await this.validate(username, password, ip);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    return {
      access_token: this.signAccessToken(user),
      refresh_token: await this.refreshTokens.issue(user.id),
    };
  }

  async refresh(presentedRefreshToken: string, ip?: string) {
    const { userId, token } = await this.refreshTokens.rotate(
      presentedRefreshToken,
      ip,
    );
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

  async logout(presentedRefreshToken?: string, ip?: string) {
    if (!presentedRefreshToken) return;
    const userId = await this.refreshTokens.revoke(presentedRefreshToken);
    await this.audit.record({
      action: 'logout',
      actorId: userId,
      ip,
    });
  }

  // Self-service password change for the logged-in user. Verifies the
  // current password, applies the new one (UsersService.update hashes it
  // and revokes every refresh token this user holds), then hands back a
  // fresh token pair so the caller's own session survives -- other
  // devices are signed out on their next refresh.
  async changePassword(
    userId: number,
    username: string,
    currentPassword: string,
    newPassword: string,
    ip?: string,
  ) {
    const user = await this.usersService.read_username(username);
    if (!user) throw new UnauthorizedException('User no longer exists');

    const currentOk = await bcrypt.compare(currentPassword, user.password);
    if (!currentOk) {
      await this.audit.record({
        action: 'password.change.failure',
        actorId: userId,
        actorUsername: user.username,
        meta: { reason: 'wrong_current_password' },
        ip,
      });
      throw new UnauthorizedException('Current password is incorrect');
    }

    const unchanged = await bcrypt.compare(newPassword, user.password);
    if (unchanged) {
      throw new BadRequestException(
        'New password must be different from the current one',
      );
    }

    await this.usersService.update(userId, { password: newPassword });

    await this.audit.record({
      action: 'password.change',
      actorId: userId,
      actorUsername: user.username,
      summary: 'Self-service password change; other sessions revoked',
      ip,
    });

    return {
      access_token: this.signAccessToken({
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      }),
      refresh_token: await this.refreshTokens.issue(user.id),
    };
  }
}
