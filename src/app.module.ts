// General Module for the NestJS application
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Need to fix Database for this to work or else crash occurs
/* import { DatabaseModule } from './database/database.module'; */
import { OrdersModule } from './orders/orders.module';
import { ItemsModule } from './items/items.module';

@Module({
  imports: [
    
    // DatabaseModule,

    // Feature Modules
    OrdersModule, 
    ItemsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
