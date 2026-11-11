import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Message } from '@/modules/chat/models/message.model';
import { Conversation } from '@/modules/chat/models/conversation.model';
import { ConversationSetting } from '@/modules/chat/models/conversation-setting.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { Company } from '@/modules/companies/models/company.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { RedisPubService } from './redis-pub.service';
import { WorkersService } from '@/modules/workers/services/workers.service';

const makeModel = () => ({
  create: jest.fn(),
  findByPk: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  findOrCreate: jest.fn(),
  bulkCreate: jest.fn(),
});

type MockModel = ReturnType<typeof makeModel>;

// Worker user 10, company members 20 and 21.
const participantConversation = {
  id: 1,
  worker: { userId: 10 },
  company: { members: [{ userId: 20 }, { userId: 21 }] },
};

describe('ChatService', () => {
  let service: ChatService;
  let messageModel: MockModel;
  let conversationModel: MockModel;
  let conversationSettingModel: MockModel;
  let workerModel: MockModel;
  let companyMemberModel: MockModel;
  let companyModel: MockModel;
  let publicationModel: MockModel;
  let redisPubService: { publishMessage: jest.Mock };

  beforeEach(async () => {
    messageModel = makeModel();
    conversationModel = makeModel();
    conversationSettingModel = makeModel();
    workerModel = makeModel();
    companyMemberModel = makeModel();
    companyModel = makeModel();
    publicationModel = makeModel();
    redisPubService = { publishMessage: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getModelToken(Message), useValue: messageModel },
        { provide: getModelToken(Conversation), useValue: conversationModel },
        { provide: getModelToken(ConversationSetting), useValue: conversationSettingModel },
        { provide: getModelToken(WorkerProfile), useValue: workerModel },
        { provide: getModelToken(CompanyMember), useValue: companyMemberModel },
        { provide: getModelToken(Company), useValue: companyModel },
        { provide: getModelToken(Publication), useValue: publicationModel },
        { provide: RedisPubService, useValue: redisPubService },
        { provide: WorkersService, useValue: { getWorkerIdByUserId: jest.fn() } },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    it('should reject an empty message', async () => {
      await expect(service.sendMessage(1, 1, '')).rejects.toThrow(BadRequestException);
    });

    it('should save the message and publish it to the company members', async () => {
      const mockMsg = { id: 1, toJSON: () => ({ id: 1, content_text: 'Hello' }) };
      messageModel.create.mockResolvedValue(mockMsg);
      conversationModel.findByPk.mockResolvedValue(participantConversation);

      const result = await service.sendMessage(10, 1, 'Hello');

      expect(messageModel.create).toHaveBeenCalled();
      expect(redisPubService.publishMessage).toHaveBeenCalledWith(
        expect.objectContaining({ receiver_id: 20 }),
      );
      expect(result).toEqual(mockMsg);
    });

    it('should refuse a user who is not part of the conversation', async () => {
      conversationModel.findByPk.mockResolvedValue(participantConversation);

      await expect(service.sendMessage(99, 1, 'Hello')).rejects.toThrow(ForbiddenException);
      expect(messageModel.create).not.toHaveBeenCalled();
    });

    it('should return 404 for an unknown conversation', async () => {
      conversationModel.findByPk.mockResolvedValue(null);

      await expect(service.sendMessage(10, 404, 'Hello')).rejects.toThrow(NotFoundException);
      expect(messageModel.create).not.toHaveBeenCalled();
    });
  });

  describe('getMessagesByConversation', () => {
    it('should refuse a user who is not part of the conversation', async () => {
      conversationModel.findByPk.mockResolvedValue(participantConversation);

      await expect(service.getMessagesByConversation(99, 1, 20, 0)).rejects.toThrow(
        ForbiddenException,
      );
      expect(messageModel.findAll).not.toHaveBeenCalled();
    });

    it('should let a company member read the messages and cap the page size', async () => {
      conversationModel.findByPk.mockResolvedValue(participantConversation);
      messageModel.findAll.mockResolvedValue([]);

      await service.getMessagesByConversation(21, 1, 5000, -3);

      expect(messageModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { conversationId: 1 }, limit: 100, offset: 0 }),
      );
    });
  });

  describe('getConversationsForCompany', () => {
    it('should refuse a user who is not a member of the company', async () => {
      companyModel.findByPk.mockResolvedValue({ id: 3 });
      companyMemberModel.findOne.mockResolvedValue(null);

      await expect(service.getConversationsForCompany(3, 99)).rejects.toThrow(ForbiddenException);
      expect(conversationModel.findAll).not.toHaveBeenCalled();
    });

    it('should never expose the worker contact details', async () => {
      companyModel.findByPk.mockResolvedValue({ id: 3 });
      companyMemberModel.findOne.mockResolvedValue({ id: 1 });
      conversationModel.findAll.mockResolvedValue([]);

      await service.getConversationsForCompany(3, 20);

      const [{ include }] = conversationModel.findAll.mock.calls[0] as [
        { include: Array<{ as?: string; include?: Array<{ attributes: string[] }> }> },
      ];
      const userAttributes = include.find((i) => i.as === 'worker')!.include![0].attributes;
      expect(userAttributes).toEqual(['id', 'first_name', 'last_name', 'profile_picture_url']);
    });
  });

  describe('getConversationDetailsForCompany', () => {
    it('should refuse a user who is not part of the conversation', async () => {
      conversationModel.findByPk.mockResolvedValue(participantConversation);

      await expect(service.getConversationDetailsForCompany(99, 1)).rejects.toThrow(
        ForbiddenException,
      );
      expect(conversationModel.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findOrCreateConversation', () => {
    beforeEach(() => {
      publicationModel.findByPk.mockResolvedValue({ id: 1, companyId: 1 });
      workerModel.findByPk.mockResolvedValue({ id: 1, userId: 100 });
      companyModel.findByPk.mockResolvedValue({ id: 1 });
      companyMemberModel.findAll.mockResolvedValue([{ userId: 200 }]);
    });

    it('should throw NotFoundException when the publication does not exist', async () => {
      publicationModel.findByPk.mockResolvedValue(null);

      await expect(service.findOrCreateConversation(200, 999, 1, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create the conversation settings on creation', async () => {
      conversationModel.findOrCreate.mockResolvedValue([{ id: 50 }, true]);

      await service.findOrCreateConversation(200, 1, 1, 1);

      expect(conversationSettingModel.bulkCreate).toHaveBeenCalledWith([
        { userId: 100, conversationId: 50 },
        { userId: 200, conversationId: 50 },
      ]);
    });

    it('should let the worker open the conversation', async () => {
      conversationModel.findOrCreate.mockResolvedValue([{ id: 50 }, false]);

      await expect(service.findOrCreateConversation(100, 1, 1, 1)).resolves.toEqual({ id: 50 });
    });

    it('should refuse a user who is neither the worker nor a company member', async () => {
      await expect(service.findOrCreateConversation(99, 1, 1, 1)).rejects.toThrow(
        ForbiddenException,
      );
      expect(conversationModel.findOrCreate).not.toHaveBeenCalled();
    });

    it('should refuse a publication that belongs to another company', async () => {
      publicationModel.findByPk.mockResolvedValue({ id: 1, companyId: 2 });

      await expect(service.findOrCreateConversation(200, 1, 1, 1)).rejects.toThrow(
        BadRequestException,
      );
      expect(conversationModel.findOrCreate).not.toHaveBeenCalled();
    });
  });
});
