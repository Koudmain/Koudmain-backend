/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from '@/modules/chat/services/chat.service';
import type { Request as ExpressRequest } from 'express';

describe('ChatController', () => {
  let controller: ChatController;
  let service: jest.Mocked<ChatService>;

  interface RequestWithUser extends ExpressRequest {
    user: {
      sub: number;
      email: string;
    };
  }

  const mockRequest = {
    user: { sub: 1, email: 'test@example.com' },
  } as RequestWithUser;

  beforeEach(async () => {
    const mockChatService = {
      findOrCreateConversation: jest.fn(),
      getConversationsForWorker: jest.fn(),
      getConversationsForCompany: jest.fn(),
      getConversationDetailsForCompany: jest.fn(),
      getMessagesByConversation: jest.fn(),
      sendMessage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: mockChatService,
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    service = module.get(ChatService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createConversation', () => {
    it('devrait appeler findOrCreateConversation avec les bons paramètres', async () => {
      const dto = { publication_id: 1, worker_id: 2, company_id: 3 };
      await controller.createConversation(dto);

      expect(service.findOrCreateConversation).toHaveBeenCalledWith(1, 2, 3);
    });
  });

  describe('getCompanyConvs', () => {
    it('devrait passer le sub de l utilisateur au service', async () => {
      const companyId = 10;
      await controller.getCompanyConvs(companyId, mockRequest);

      expect(service.getConversationsForCompany).toHaveBeenCalledWith(companyId, 1);
    });
  });

  describe('send', () => {
    it('devrait envoyer un message avec l ID de l utilisateur authentifié', async () => {
      const body = { conversation_id: 5, content: 'Hello' };
      await controller.send(mockRequest, body);

      expect(service.sendMessage).toHaveBeenCalledWith(1, 5, 'Hello');
    });
  });
});
