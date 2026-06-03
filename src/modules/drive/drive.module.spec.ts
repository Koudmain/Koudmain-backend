import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DriveService } from './drive.service';

describe('DriveModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('mock-google-value'),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        DriveService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();
  });

  it('le module doit être défini et charger correctement DriveService', () => {
    expect(moduleRef).toBeDefined();

    const service = moduleRef.get<DriveService>(DriveService);

    expect(service).toBeInstanceOf(DriveService);
  });
});
