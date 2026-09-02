import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './asvc-auth.service';
import { Public } from './public.decorator';

@Controller('authenticate')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Public, but rate-limited: 5 attempts / 60s per IP (see ThrottlerModule in AppModule).
  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    return this.authService.login(body.username, body.password);
  }

  // Protected by the global JwtAuthGuard.
  @Get('profile')
  getProfile(@Req() req) {
    return req.user;
  }
}
