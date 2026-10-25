import { Test, TestingModule } from '@nestjs/testing';
import { UserDocumentsController } from './user-documents.controller';
import { DocumentsService } from '@/modules/documents/services/document.service';
import { type RequestWithUser } from '@/common/types/request.type';

jest.mock('@/modules/pdf/services/pdf.service', () => ({ PdfService: class PdfService {} }));

describe('UserDocumentsController', () => {
  let controller: UserDocumentsController;

  const mockDocumentsService = { findAll: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserDocumentsController],
      providers: [{ provide: DocumentsService, useValue: mockDocumentsService }],
    }).compile();

    controller = module.get<UserDocumentsController>(UserDocumentsController);

    jest.resetAllMocks();
  });

  it('doit renvoyer les documents rattachés au compte connecté', async () => {
    const req = { user: { sub: 1, email: 'alex@koudmain.fr' } } as RequestWithUser;
    mockDocumentsService.findAll.mockResolvedValue([{ id: 42 }]);

    await expect(controller.getDocumentsByUserId(req)).resolves.toEqual([{ id: 42 }]);
    expect(mockDocumentsService.findAll).toHaveBeenCalledWith(1, { userId: 1 });
  });
});
