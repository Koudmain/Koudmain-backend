import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from './document.controller';
import { DocumentsService } from '@/modules/documents/services/document.service';
import { DocumentSignatureService } from '@/modules/documents/services/document-signature.service';
import { DocumentCategory } from '@/modules/documents/models/document.model';
import { type RequestWithUser } from '@/common/types/request.type';

jest.mock('@/modules/pdf/services/pdf.service', () => ({ PdfService: class PdfService {} }));

describe('DocumentsController', () => {
  let controller: DocumentsController;

  const mockDocumentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    generateContract: jest.fn(),
    getDownloadUrl: jest.fn(),
    listFileVersions: jest.fn(),
    replaceFile: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockSignatureService = {
    requestSignature: jest.fn(),
    getSigningLink: jest.fn(),
  };

  const req = { user: { sub: 1, email: 'alex@koudmain.fr' } } as RequestWithUser;
  const file = { buffer: Buffer.from('%PDF'), originalname: 'rib.pdf' } as Express.Multer.File;
  const result = { id: 42 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        { provide: DocumentsService, useValue: mockDocumentsService },
        { provide: DocumentSignatureService, useValue: mockSignatureService },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);

    jest.resetAllMocks();
  });

  it('create doit déposer le document au nom de l’utilisateur connecté', async () => {
    const dto = { name: 'Mon RIB', category: DocumentCategory.RIB };
    mockDocumentsService.create.mockResolvedValue(result);

    await expect(controller.create(req, dto, file)).resolves.toBe(result);
    expect(mockDocumentsService.create).toHaveBeenCalledWith(1, dto, file);
  });

  it('findAll doit transmettre les filtres', async () => {
    const query = { category: DocumentCategory.RIB, search: 'rib' };
    mockDocumentsService.findAll.mockResolvedValue([result]);

    await expect(controller.findAll(req, query)).resolves.toEqual([result]);
    expect(mockDocumentsService.findAll).toHaveBeenCalledWith(1, query);
  });

  it('getDocumentsByMissionId doit filtrer par mission', async () => {
    mockDocumentsService.findAll.mockResolvedValue([result]);

    await controller.getDocumentsByMissionId(req, 8);

    expect(mockDocumentsService.findAll).toHaveBeenCalledWith(1, { missionId: 8 });
  });

  it('generateContract doit générer le contrat de la mission', async () => {
    mockDocumentsService.generateContract.mockResolvedValue(result);

    await expect(controller.generateContract(req, 8)).resolves.toBe(result);
    expect(mockDocumentsService.generateContract).toHaveBeenCalledWith(1, 8);
  });

  it('getById doit renvoyer le document', async () => {
    mockDocumentsService.findOne.mockResolvedValue(result);

    await expect(controller.getById(req, 42)).resolves.toBe(result);
    expect(mockDocumentsService.findOne).toHaveBeenCalledWith(1, 42);
  });

  it('getDownloadUrl doit transmettre les options de téléchargement', async () => {
    const download = { url: 'https://s3.example/signed', expiresIn: 900 };
    mockDocumentsService.getDownloadUrl.mockResolvedValue(download);

    await expect(
      controller.getDownloadUrl(req, 42, { inline: true, versionId: 'v1' }),
    ).resolves.toBe(download);
    expect(mockDocumentsService.getDownloadUrl).toHaveBeenCalledWith(1, 42, {
      inline: true,
      versionId: 'v1',
    });
  });

  it('listFileVersions doit lister les versions du fichier', async () => {
    mockDocumentsService.listFileVersions.mockResolvedValue([]);

    await expect(controller.listFileVersions(req, 42)).resolves.toEqual([]);
    expect(mockDocumentsService.listFileVersions).toHaveBeenCalledWith(1, 42);
  });

  it('requestSignature doit envoyer le contrat en signature', async () => {
    mockSignatureService.requestSignature.mockResolvedValue({ url: 'https://sign/x' });

    await expect(controller.requestSignature(req, 42)).resolves.toEqual({ url: 'https://sign/x' });
    expect(mockSignatureService.requestSignature).toHaveBeenCalledWith(1, 42);
  });

  it('getSigningLink doit renvoyer le lien de signature', async () => {
    mockSignatureService.getSigningLink.mockResolvedValue({ url: 'https://sign/y' });

    await expect(controller.getSigningLink(req, 42)).resolves.toEqual({ url: 'https://sign/y' });
    expect(mockSignatureService.getSigningLink).toHaveBeenCalledWith(1, 42);
  });

  it('replaceFile doit remplacer le fichier', async () => {
    mockDocumentsService.replaceFile.mockResolvedValue(result);

    await expect(controller.replaceFile(req, 42, file)).resolves.toBe(result);
    expect(mockDocumentsService.replaceFile).toHaveBeenCalledWith(1, 42, file);
  });

  it('update doit mettre à jour le document', async () => {
    mockDocumentsService.update.mockResolvedValue(result);

    await expect(controller.update(req, 42, { name: 'Renommé' })).resolves.toBe(result);
    expect(mockDocumentsService.update).toHaveBeenCalledWith(1, 42, { name: 'Renommé' });
  });

  it('delete doit supprimer le document', async () => {
    const deleted = { message: 'Document supprimé avec succès', id: 42 };
    mockDocumentsService.delete.mockResolvedValue(deleted);

    await expect(controller.delete(req, 42)).resolves.toBe(deleted);
    expect(mockDocumentsService.delete).toHaveBeenCalledWith(1, 42);
  });
});
