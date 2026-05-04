import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ChatController } from './controllers/chat.controller';
import { ChatService } from './services/chat.service';
import { RedisPubService } from './services/redis-pub.service';
import { Message } from './models/message.model';
import { Conversation } from './models/conversation.model';
import { WorkersModule } from '@/modules/workers/workers.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { ConversationSetting } from './models/conversation-setting.model';
import { WorkerProfile } from '../workers/models/worker-profile.model';
import { CompanyMember } from '../companies/models/company-member.model';

@Module({
  imports: [SequelizeModule.forFeature([Message, Conversation, ConversationSetting, WorkerProfile, CompanyMember]), WorkersModule, CompaniesModule],
  controllers: [ChatController],
  providers: [ChatService, RedisPubService],
  exports: [ChatService],
})
export class ChatModule {}
