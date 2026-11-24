import { Test } from '@nestjs/testing';
import { ApplicationController } from './application.controller';
import { ApplicationService } from '@/modules/application/services/application.service';
import { ApplicationNotificationService } from '@/modules/notification/application/application-notification.service';

describe('ApplicationController', () => {
  let controller: ApplicationController;
  let mockApplicationService: {
    findForUser: jest.Mock;
    assertMemberOfPublicationCompany: jest.Mock;
  };
  let mockApplicationNotificationService: {
    resetUnseenCount: jest.Mock;
    getUnseenCount: jest.Mock;
  };

  const req = { user: { sub: 1, email: 'a@b.com' } } as never;

  beforeEach(async () => {
    mockApplicationService = {
      findForUser: jest.fn().mockResolvedValue([{ id: 1 }]),
      assertMemberOfPublicationCompany: jest.fn().mockResolvedValue(5),
    };
    mockApplicationNotificationService = {
      resetUnseenCount: jest.fn().mockResolvedValue(undefined),
      getUnseenCount: jest.fn().mockResolvedValue(3),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ApplicationController],
      providers: [
        { provide: ApplicationService, useValue: mockApplicationService },
        { provide: ApplicationNotificationService, useValue: mockApplicationNotificationService },
      ],
    }).compile();

    controller = moduleRef.get(ApplicationController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('get', () => {
    it('returns the applications without resetting the counter when no publicationId is given', async () => {
      const result = await controller.get(req, {});

      expect(result).toEqual([{ id: 1 }]);
      expect(mockApplicationService.findForUser).toHaveBeenCalledWith(1, {});
      expect(mockApplicationNotificationService.resetUnseenCount).not.toHaveBeenCalled();
    });

    it('resets the unseen counter when publicationId is given', async () => {
      await controller.get(req, { publicationId: 10 });

      expect(mockApplicationNotificationService.resetUnseenCount).toHaveBeenCalledWith(10);
    });
  });

  describe('getUnreadCount', () => {
    it('checks authorization then returns the unseen count', async () => {
      const result = await controller.getUnreadCount(req, { publicationId: 10 });

      expect(mockApplicationService.assertMemberOfPublicationCompany).toHaveBeenCalledWith(1, 10);
      expect(mockApplicationNotificationService.getUnseenCount).toHaveBeenCalledWith(10);
      expect(result).toEqual({ count: 3 });
    });
  });
});
