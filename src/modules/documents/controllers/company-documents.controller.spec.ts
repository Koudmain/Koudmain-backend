import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { CompanyDocumentsController } from './company-documents.controller';
import { DocumentsService } from '@/modules/documents/services/document.service';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { DocumentCategory } from '@/modules/documents/models/document.model';
import { type RequestWithUser } from '@/common/types/request.type';

jest.mock('@/modules/pdf/services/pdf.service', () => ({ PdfService: class PdfService {} }));

describe('CompanyDocumentsController', () => {
  let controller: CompanyDocumentsController;

  const mockDocumentsService = { findAll: jest.fn() };
  const mockCompaniesService = { isUserInCompany: jest.fn() };

  const req = { user: { sub: 2, email: 'sam@koudmain.fr' } } as RequestWithUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyDocumentsController],
      providers: [
        { provide: DocumentsService, useValue: mockDocumentsService },
        { provide: CompaniesService, useValue: mockCompaniesService },
      ],
    }).compile();

    controller = module.get<CompanyDocumentsController>(CompanyDocumentsController);

    jest.resetAllMocks();
  });

  it('doit renvoyer les documents de l’entreprise à un membre', async () => {
    mockCompaniesService.isUserInCompany.mockResolvedValue(true);
    mockDocumentsService.findAll.mockResolvedValue([{ id: 42 }]);

    await expect(controller.getDocumentsByCompanyId(req, 10)).resolves.toEqual([{ id: 42 }]);
    expect(mockCompaniesService.isUserInCompany).toHaveBeenCalledWith(2, 10);
    expect(mockDocumentsService.findAll).toHaveBeenCalledWith(2, { companyId: 10 });
  });

  it('doit transmettre les filtres de catégorie et de type', async () => {
    mockCompaniesService.isUserInCompany.mockResolvedValue(true);
    mockDocumentsService.findAll.mockResolvedValue([{ id: 42 }]);

    const query = { category: DocumentCategory.KBIS, type: 'KBIS_2026' };
    await expect(controller.getDocumentsByCompanyId(req, 10, query)).resolves.toEqual([{ id: 42 }]);
    expect(mockCompaniesService.isUserInCompany).toHaveBeenCalledWith(2, 10);
    expect(mockDocumentsService.findAll).toHaveBeenCalledWith(2, {
      category: DocumentCategory.KBIS,
      type: 'KBIS_2026',
      companyId: 10,
    });
  });

  it('doit refuser un utilisateur extérieur à l’entreprise', async () => {
    mockCompaniesService.isUserInCompany.mockResolvedValue(false);

    await expect(controller.getDocumentsByCompanyId(req, 10)).rejects.toThrow(ForbiddenException);
    expect(mockDocumentsService.findAll).not.toHaveBeenCalled();
  });
});
