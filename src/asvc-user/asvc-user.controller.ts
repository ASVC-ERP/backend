import { Controller, Get, Post, Put, Delete, Param, Body, ValidationPipe } from '@nestjs/common';
import { UsersService } from './asvc-user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body(new ValidationPipe()) dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  async read() {
    return this.usersService.read();
  }

  @Get(':id')
  async read_one(@Param('id') id: string) {
    return this.usersService.read_one(Number(id));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body(new ValidationPipe()) dto: UpdateUserDto) {
    return this.usersService.update(Number(id), dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.usersService.delete(Number(id));
  }
}
