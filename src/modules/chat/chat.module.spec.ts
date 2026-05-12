import { Test } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/sequelize';
import { ChatService } from './services/chat.service';
import { ChatController } from './controllers/chat.controller';
import { RedisPubService } from './services/redis-pub.service';
import { Message } from './models/message.model';
import { Conversation } from './models/conversation.model';
import { ConversationSetting } from './models/conversation-setting.model';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { Company } from '@/modules/companies/models/company.model';
import { Publication } from '@/modules/publication/models/publication.model';

describe('ChatModule', () => {
  it('devrait compiler le module et résoudre ses dépendances', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        ChatService,
        {
          provide: RedisPubService,
          useValue: { publishMessage: jest.fn() },
        },
        {
          provide: WorkersService,
          useValue: { getWorkerIdByUserId: jest.fn() },
        },
        {
          provide: getConnectionToken(),
          useValue: { query: jest.fn() },
        },
        { provide: getModelToken(Message), useValue: {} },
        { provide: getModelToken(Conversation), useValue: {} },
        { provide: getModelToken(ConversationSetting), useValue: {} },
        { provide: getModelToken(WorkerProfile), useValue: {} },
        { provide: getModelToken(CompanyMember), useValue: {} },
        { provide: getModelToken(Company), useValue: {} },
        { provide: getModelToken(Publication), useValue: {} },
      ],
    }).compile();

    const controller = moduleRef.get<ChatController>(ChatController);
    const service = moduleRef.get<ChatService>(ChatService);

    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });
});
