/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Message } from '../models/message.model';
import { Conversation } from '../models/conversation.model';
import { ConversationSetting } from '../models/conversation-setting.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { Company } from '@/modules/companies/models/company.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { RedisPubService } from './redis-pub.service';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { beforeEach } from 'node:test';

type MockModel<T = any> = {
  [P in keyof T]?: jest.Mock;
} & {
  create: jest.Mock;
  findByPk: jest.Mock;
  findOne: jest.Mock;
  findAll: jest.Mock;
  findOrCreate: jest.Mock;
  bulkCreate: jest.Mock;
};

interface ChatServiceMocks {
  publicationModel: MockModel<Publication>;
  workerModel: MockModel<WorkerProfile>;
  companyModel: MockModel<Company>;
  companyMemberModel: MockModel<CompanyMember>;
  conversationSettingModel: MockModel<ConversationSetting>;
}

describe('ChatService', () => {
  let service: ChatService;
  let messageModel: MockModel<Message>;
  let conversationModel: MockModel<Conversation>;
  let redisPubService: jest.Mocked<RedisPubService>;

  const mockModel: Record<string, jest.Mock> = {
    create: jest.fn(),
    findByPk: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOrCreate: jest.fn(),
    bulkCreate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getModelToken(Message), useValue: { ...mockModel } },
        { provide: getModelToken(Conversation), useValue: { ...mockModel } },
        { provide: getModelToken(ConversationSetting), useValue: { ...mockModel } },
        { provide: getModelToken(WorkerProfile), useValue: { ...mockModel } },
        { provide: getModelToken(CompanyMember), useValue: { ...mockModel } },
        { provide: getModelToken(Company), useValue: { ...mockModel } },
        { provide: getModelToken(Publication), useValue: { ...mockModel } },
        { provide: RedisPubService, useValue: { publishMessage: jest.fn() } },
        { provide: WorkersService, useValue: { getWorkerIdByUserId: jest.fn() } },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    messageModel = module.get<MockModel<Message>>(getModelToken(Message));
    conversationModel = module.get<MockModel<Conversation>>(getModelToken(Conversation));
    redisPubService = module.get(RedisPubService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    it('devrait lever une erreur si le contenu est vide', async () => {
      await expect(service.sendMessage(1, 1, '')).rejects.toThrow(BadRequestException);
    });

    it('devrait créer un message et le publier sur Redis', async () => {
      const mockMsg = { id: 1, toJSON: () => ({ id: 1, content_text: 'Hello' }) };
      const mockConv = {
        id: 1,
        worker: { user_id: 10 },
        company: { members: [{ user_id: 20 }] },
      };

      messageModel.create.mockResolvedValue(mockMsg);
      conversationModel.findByPk.mockResolvedValue(mockConv);

      const result = await service.sendMessage(10, 1, 'Hello');

      expect(messageModel.create).toHaveBeenCalled();
      expect(() => redisPubService.publishMessage).toHaveBeenCalledWith(
        expect.objectContaining({ receiver_id: 20 }),
      );
      expect(result).toEqual(mockMsg);
    });
  });

  describe('findOrCreateConversation', () => {
    it("devrait lever NotFoundException si la publication n'existe pas", async () => {
      const serviceMocks = service as unknown as ChatServiceMocks;
      serviceMocks.publicationModel.findByPk.mockResolvedValue(null);

      await expect(service.findOrCreateConversation(999, 1, 1)).rejects.toThrow(NotFoundException);
    });

    it("devrait créer les réglages de conversation lors d'une création", async () => {
      const serviceMocks = service as unknown as ChatServiceMocks;

      serviceMocks.publicationModel.findByPk.mockResolvedValue({ id: 1 });
      serviceMocks.workerModel.findByPk.mockResolvedValue({ id: 1, user_id: 100 });
      serviceMocks.companyModel.findByPk.mockResolvedValue({ id: 1 });

      conversationModel.findOrCreate.mockResolvedValue([{ id: 50 }, true]);

      serviceMocks.companyMemberModel.findAll.mockResolvedValue([{ user_id: 200 }]);

      await service.findOrCreateConversation(1, 1, 1);

      expect(service['conversationSettingModel'].bulkCreate).toHaveBeenCalledWith([
        { user_id: 100, conversation_id: 50 },
        { user_id: 200, conversation_id: 50 },
      ]);
    });
  });
});
