import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { ChatModule } from './chat.module';
import { ChatService } from './services/chat.service';
import { ChatController } from './controllers/chat.controller';
import { RedisPubService } from './services/redis-pub.service';
import { Message } from './models/message.model';
import { Conversation } from './models/conversation.model';
import { ConversationSetting } from './models/conversation-setting.model';
import { WorkerProfile } from '../workers/models/worker-profile.model';
import { CompanyMember } from '../companies/models/company-member.model';
import { Company } from '../companies/models/company.model';
import { Publication } from '../publication/models/publication.model';

describe('ChatModule', () => {
  it('devrait compiler le module et résoudre ses dépendances', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ChatModule],
    })
      .overrideProvider(getModelToken(Message))
      .useValue({})
      .overrideProvider(getModelToken(Conversation))
      .useValue({})
      .overrideProvider(getModelToken(ConversationSetting))
      .useValue({})
      .overrideProvider(getModelToken(WorkerProfile))
      .useValue({})
      .overrideProvider(getModelToken(CompanyMember))
      .useValue({})
      .overrideProvider(getModelToken(Company))
      .useValue({})
      .overrideProvider(getModelToken(Publication))
      .useValue({})
      .overrideProvider(RedisPubService)
      .useValue({})
      .compile();

    const controller = moduleRef.get<ChatController>(ChatController);
    const service = moduleRef.get<ChatService>(ChatService);

    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });
});
