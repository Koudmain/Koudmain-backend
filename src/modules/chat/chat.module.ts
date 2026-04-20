import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ChatController } from './controllers/chat.controller';
import { ChatService } from './services/chat.service';
import { RedisPubService } from './services/redis-pub.service';
import { Message } from './models/message.model';
import { Conversation } from './models/conversation.model';
import { WorkersModule } from '@/modules/workers/workers.module';
import { CompaniesModule } from '@/modules/companies/companies.module';

@Module({
  imports: [SequelizeModule.forFeature([Message, Conversation]), WorkersModule, CompaniesModule],
  controllers: [ChatController],
  providers: [ChatService, RedisPubService],
  exports: [ChatService],
})
export class ChatModule {}
