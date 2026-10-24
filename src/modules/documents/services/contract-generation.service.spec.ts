import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContractGenerationService } from './contract-generation.service';
import { PdfService } from '@/modules/pdf/services/pdf.service';
import { Mission } from '@/modules/missions/mission.model';
import { User } from '@/modules/users/models/user.model';

jest.mock('@/modules/pdf/services/pdf.service', () => ({ PdfService: class PdfService {} }));

describe('ContractGenerationService', () => {
  let service: ContractGenerationService;

  const mockMissionModel = {
    findByPk: jest.fn(),
  };

  const mockUserModel = {
    findByPk: jest.fn(),
  };

  const mockPdfService = {
    generateCddu: jest.fn(),
  };

  const pdf = Buffer.from('%PDF-1.7');

  const mission = ({
    siret = '12345678900011' as string | null,
    finalPrice = null as string | null,
    publication = {} as Record<string, unknown> | null,
    companyAddress = { full_address: '2 avenue Foch, 69006 Lyon' } as object | null,
    workerAddress = { full_address: '3 place Bellecour, 69002 Lyon' } as object | null,
    birthDate = '1998-03-02' as string | null,
  } = {}) => ({
    finalPrice,
    company: {
      name: 'Koudmain SAS',
      address: companyAddress,
      get: jest.fn((key: string) => (key === 'siret' ? siret : undefined)),
    },
    worker: {
      user: { first_name: 'Alex', last_name: 'Martin', birth_date: birthDate },
      address: workerAddress,
    },
    publication: publication && {
      title: 'Serveur',
      description: 'Service du soir',
      hourly_rate: '12.50',
      starting_date: new Date('2026-11-01T18:00:00Z'),
      ending_date: new Date('2026-11-01T23:20:00Z'),
      address: {
        full_address: null,
        street_number: '1',
        street_name: 'rue de la Paix',
        zip_code: '75002',
        city: 'Paris',
      },
      ...publication,
    },
  });

  const generatedData = () => mockPdfService.generateCddu.mock.calls[0][0];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractGenerationService,
        { provide: getModelToken(Mission), useValue: mockMissionModel },
        { provide: getModelToken(User), useValue: mockUserModel },
        { provide: PdfService, useValue: mockPdfService },
      ],
    }).compile();

    service = module.get<ContractGenerationService>(ContractGenerationService);

    jest.clearAllMocks();
    jest.useFakeTimers({ now: new Date('2026-10-15T10:00:00Z') });
    mockPdfService.generateCddu.mockResolvedValue(pdf);
    mockUserModel.findByPk.mockResolvedValue({ first_name: 'Sam', last_name: 'Durand' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('doit générer le CDDU à partir des données de la mission', async () => {
    mockMissionModel.findByPk.mockResolvedValue(mission());

    await expect(service.generateCddu(8, 2, 42)).resolves.toBe(pdf);

    expect(mockMissionModel.findByPk).toHaveBeenCalledWith(8, expect.any(Object));
    expect(mockUserModel.findByPk).toHaveBeenCalledWith(2, expect.any(Object));
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

  it('doit dater le contrat en heure de Paris', async () => {
    jest.setSystemTime(new Date('2026-12-31T23:30:00Z'));
    mockMissionModel.findByPk.mockResolvedValue(mission());

    await service.generateCddu(8, 2, 42);

    expect(generatedData()).toMatchObject({
      createdDate: '01/01/2027',
      contractRef: 'CDDU-2027-42',
    });
  });

  it('doit préférer le prix final de la mission au calcul horaire', async () => {
    mockMissionModel.findByPk.mockResolvedValue(mission({ finalPrice: '80.00' }));

    await service.generateCddu(8, 2, 42);

    expect(generatedData().totalGrossSalary).toBe(80);
  });

  it('doit remplacer les champs facultatifs absents par des chaînes vides', async () => {
    mockMissionModel.findByPk.mockResolvedValue(
      mission({
        publication: { title: null, description: null, address: null },
        companyAddress: null,
        workerAddress: null,
        birthDate: null,
      }),
    );
    mockUserModel.findByPk.mockResolvedValue(null);

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
    mockMissionModel.findByPk.mockResolvedValue(null);

    await expect(service.generateCddu(404, 2, 42)).rejects.toThrow(NotFoundException);
    expect(mockPdfService.generateCddu).not.toHaveBeenCalled();
  });

  it.each([null, '', '   '])('doit exiger le SIRET de l’entreprise (%p)', async (siret) => {
    mockMissionModel.findByPk.mockResolvedValue(mission({ siret }));

    await expect(service.generateCddu(8, 2, 42)).rejects.toThrow(
      "Complétez le SIRET de l'entreprise avant de générer le contrat",
    );
  });

  it.each(['starting_date', 'ending_date', 'hourly_rate'])(
    'doit exiger %s dans la publication',
    async (field) => {
      mockMissionModel.findByPk.mockResolvedValue(mission({ publication: { [field]: null } }));

      await expect(service.generateCddu(8, 2, 42)).rejects.toThrow(BadRequestException);
      expect(mockPdfService.generateCddu).not.toHaveBeenCalled();
    },
  );

  it('doit exiger une publication rattachée à la mission', async () => {
    mockMissionModel.findByPk.mockResolvedValue(mission({ publication: null }));

    await expect(service.generateCddu(8, 2, 42)).rejects.toThrow(BadRequestException);
  });
});
