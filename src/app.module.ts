// General Module for the NestJS application
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SheetsModule } from './sheets/sheets.module';
import { OrdersModule } from './orders/orders.module';
import { ItemsModule } from './items/items.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    SheetsModule,       // Google Sheet Database Module
    OrdersModule, 
    ItemsModule,
    SuppliersModule,
    AuthModule,    // Suppliers Module
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
