import { Test, TestingModule } from '@nestjs/testing';
import { Sequelize } from 'sequelize-typescript';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContractGenerationService } from './contract-generation.service';
import { PdfService } from '@/modules/pdf/services/pdf.service';

jest.mock('@/modules/pdf/services/pdf.service', () => ({ PdfService: class PdfService {} }));

describe('ContractGenerationService', () => {
  let service: ContractGenerationService;

  const mockSequelize = {
    query: jest.fn(),
  };

  const mockPdfService = {
    generateCddu: jest.fn(),
  };

  const pdf = Buffer.from('%PDF-1.7');

  const missionRow = (overrides: Record<string, unknown> = {}) => ({
    finalPrice: null,
    jobTitle: 'Serveur',
    missionDescription: 'Service du soir',
    hourlyRate: '12.50',
    startDate: '01/11/2026 à 18:00',
    endDate: '01/11/2026 à 23:20',
    totalHours: '5.3333333',
    missionLocation: '1 rue de la Paix, 75002 Paris',
    companyName: 'Koudmain SAS',
    siret: '12345678900011',
    companyAddress: '2 avenue Foch, 69006 Lyon',
    workerFirstName: 'Alex',
    workerLastName: 'Martin',
    workerBirthDate: '02/03/1998',
    workerAddress: '3 place Bellecour, 69002 Lyon',
    representative: 'Sam Durand',
    createdDate: '15/10/2026',
    ...overrides,
  });

  const generatedData = () => mockPdfService.generateCddu.mock.calls[0][0];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractGenerationService,
        { provide: Sequelize, useValue: mockSequelize },
        { provide: PdfService, useValue: mockPdfService },
      ],
    }).compile();

    service = module.get<ContractGenerationService>(ContractGenerationService);

    jest.clearAllMocks();
    mockPdfService.generateCddu.mockResolvedValue(pdf);
  });

  it('doit générer le CDDU à partir des données de la mission', async () => {
    mockSequelize.query.mockResolvedValue([[missionRow()]]);

    await expect(service.generateCddu(8, 2, 42)).resolves.toBe(pdf);

    expect(mockSequelize.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE m.id = :missionId'),
      {
        replacements: { missionId: 8, representativeUserId: 2 },
      },
    );
    expect(generatedData()).toEqual({
      contractRef: 'CDDU-2026-42',
      createdDate: '15/10/2026',
      employer: {
        name: 'Koudmain SAS',
        siret: '12345678900011',
        address: '2 avenue Foch, 69006 Lyon',
        representative: 'Sam Durand',
      },
      employee: {
        firstName: 'Alex',
        lastName: 'Martin',
        nir: '',
        birthDate: '02/03/1998',
        address: '3 place Bellecour, 69002 Lyon',
      },
      jobTitle: 'Serveur',
      missionDescription: 'Service du soir',
      startDate: '01/11/2026 à 18:00',
      endDate: '01/11/2026 à 23:20',
      totalHours: 5.33,
      hourlyRate: 12.5,
      totalGrossSalary: 66.63,
      missionLocation: '1 rue de la Paix, 75002 Paris',
    });
  });

  it('doit préférer le prix final de la mission au calcul horaire', async () => {
    mockSequelize.query.mockResolvedValue([[missionRow({ finalPrice: '80.00' })]]);

    await service.generateCddu(8, 2, 42);

    expect(generatedData().totalGrossSalary).toBe(80);
  });

  it('doit remplacer les champs facultatifs absents par des chaînes vides', async () => {
    mockSequelize.query.mockResolvedValue([
      [
        missionRow({
          jobTitle: null,
          missionDescription: null,
          missionLocation: null,
          companyAddress: null,
          workerBirthDate: null,
          workerAddress: null,
          representative: null,
        }),
      ],
    ]);

    await service.generateCddu(8, 2, 42);

    expect(generatedData()).toMatchObject({
      jobTitle: '',
      missionDescription: '',
      missionLocation: '',
      employer: { address: '', representative: '' },
      employee: { birthDate: '', address: '' },
    });
  });

  it('doit lever NotFoundException si la mission est introuvable', async () => {
    mockSequelize.query.mockResolvedValue([[]]);

    await expect(service.generateCddu(404, 2, 42)).rejects.toThrow(NotFoundException);
    expect(mockPdfService.generateCddu).not.toHaveBeenCalled();
  });

  it.each([null, '', '   '])('doit exiger le SIRET de l’entreprise (%p)', async (siret) => {
    mockSequelize.query.mockResolvedValue([[missionRow({ siret })]]);

    await expect(service.generateCddu(8, 2, 42)).rejects.toThrow(
      "Complétez le SIRET de l'entreprise avant de générer le contrat",
    );
  });

  it.each(['startDate', 'endDate', 'totalHours', 'hourlyRate'])(
    'doit exiger %s dans la publication',
    async (field) => {
      mockSequelize.query.mockResolvedValue([[missionRow({ [field]: null })]]);

      await expect(service.generateCddu(8, 2, 42)).rejects.toThrow(BadRequestException);
      expect(mockPdfService.generateCddu).not.toHaveBeenCalled();
    },
  );
});
