import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { PushModule } from './push.module';
import { DeviceToken } from './models/device-token.model';
import { DeviceTokenService } from './services/device-token.service';
import { DeviceTokenController } from './controllers/device-token.controller';

describe('PushModule', () => {
  it('le module doit être défini et charger correctement ses composants', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [PushModule],
    })
      .overrideProvider(getModelToken(DeviceToken))
      .useValue({})
      .compile();

    expect(moduleRef.get<DeviceTokenService>(DeviceTokenService)).toBeInstanceOf(
      DeviceTokenService,
    );
    expect(moduleRef.get<DeviceTokenController>(DeviceTokenController)).toBeInstanceOf(
      DeviceTokenController,
    );
  });
});
