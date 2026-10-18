import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WorkerDocumentsController } from './worker-documents.controller';
import { DocumentsService } from '@/modules/documents/services/document.service';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { type RequestWithUser } from '@/common/types/request.type';

jest.mock('@/modules/pdf/services/pdf.service', () => ({ PdfService: class PdfService {} }));

describe('WorkerDocumentsController', () => {
  let controller: WorkerDocumentsController;

  const mockDocumentsService = { findAll: jest.fn() };
  const mockWorkersService = { getWorkerByUserId: jest.fn() };

  const req = { user: { sub: 1, email: 'alex@koudmain.fr' } } as RequestWithUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkerDocumentsController],
      providers: [
        { provide: DocumentsService, useValue: mockDocumentsService },
        { provide: WorkersService, useValue: mockWorkersService },
      ],
    }).compile();

    controller = module.get<WorkerDocumentsController>(WorkerDocumentsController);

    jest.resetAllMocks();
  });

  it('doit renvoyer les documents du profil worker de l’utilisateur', async () => {
    mockWorkersService.getWorkerByUserId.mockResolvedValue({ id: 3 });
    mockDocumentsService.findAll.mockResolvedValue([{ id: 42 }]);

    await expect(controller.getDocumentsByWorkerId(req)).resolves.toEqual([{ id: 42 }]);
    expect(mockWorkersService.getWorkerByUserId).toHaveBeenCalledWith(1);
    expect(mockDocumentsService.findAll).toHaveBeenCalledWith(1, { workerId: 3 });
  });

  it('doit refuser un utilisateur sans profil worker', async () => {
    mockWorkersService.getWorkerByUserId.mockResolvedValue(null);

    await expect(controller.getDocumentsByWorkerId(req)).rejects.toThrow(BadRequestException);
    expect(mockDocumentsService.findAll).not.toHaveBeenCalled();
  });
});
