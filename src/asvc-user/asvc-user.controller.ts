import { Controller, Get, Post, Put, Delete, Param, Body, Req, ValidationPipe } from '@nestjs/common';
import { UsersService } from './asvc-user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../asvc-auth/roles.decorator';
import { AuditCtx } from '../audit/audit.service';

// req.user is set by JwtStrategy: { userId, username, name, role }.
function ctxFrom(req): AuditCtx {
  return { actorId: req.user?.userId, actorUsername: req.user?.username, ip: req.ip };
}

// Global JwtAuthGuard applies; @Roles restricts every route here to admins.
@Roles('admin')
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body(new ValidationPipe()) dto: CreateUserDto, @Req() req) {
    return this.usersService.create(dto, ctxFrom(req));
  }

  @Get()
  async read() {
    return this.usersService.read();
  }

  @Get('username/:username')
  async getUsername(@Param('username') username: string) {
    const user = await this.usersService.read_username(username);
    if (!user) return null;
    const { password, ...safe } = user;
    return safe;
  }

  @Get(':id')
  async read_one(@Param('id') id: string) {
    return this.usersService.read_one(Number(id));
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe()) dto: UpdateUserDto,
    @Req() req,
  ) {
    return this.usersService.update(Number(id), dto, ctxFrom(req));
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req) {
    return this.usersService.delete(Number(id), ctxFrom(req));
  }
}
