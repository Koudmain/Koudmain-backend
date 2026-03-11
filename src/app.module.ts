import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OffersModule } from './modules/offers/offers.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [OffersModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
