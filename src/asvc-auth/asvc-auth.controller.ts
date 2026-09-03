import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './asvc-auth.service';
import { Public } from './public.decorator';

const REFRESH_COOKIE = 'refresh_token';

const refreshCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/api/authenticate',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

@Controller('authenticate')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Public, but rate-limited: 5 attempts / 60s per IP (see ThrottlerModule in AppModule).
  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  async login(
    @Body() body: { username: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token } = await this.authService.login(
      body.username,
      body.password,
    );
    res.cookie(REFRESH_COOKIE, refresh_token, refreshCookieOptions);
    return { access_token };
  }

  // Public: authenticates via the refresh cookie, not a bearer token.
  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const presented = req.cookies?.[REFRESH_COOKIE];
    if (!presented) throw new UnauthorizedException('No refresh token');

    const { access_token, refresh_token } = await this.authService.refresh(presented);
    res.cookie(REFRESH_COOKIE, refresh_token, refreshCookieOptions);
    return { access_token };
  }

  @Public()
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });
    return { ok: true };
  }

  // Protected by the global JwtAuthGuard.
  @Get('profile')
  getProfile(@Req() req) {
    return req.user;
  }
}
