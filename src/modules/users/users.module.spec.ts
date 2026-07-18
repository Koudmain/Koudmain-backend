import { Test } from '@nestjs/testing';
import { UsersModule } from './users.module';
import { UsersController } from './users.controller';
import { UsersService } from './services/users.service';
import { getModelToken } from '@nestjs/sequelize';
import { User } from './models/user.model';
import { DriveService } from '../drive/drive.service';

describe('UsersModule Integration', () => {
  it('should compile the module successfully', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [UsersModule],
    })
      .overrideProvider(getModelToken(User))
      .useValue({})
      .overrideProvider(DriveService)
      .useValue({})
      .compile();
    const controller = moduleRef.get<UsersController>(UsersController);
    const service = moduleRef.get<UsersService>(UsersService);

    expect(moduleRef).toBeDefined();
    expect(controller).toBeInstanceOf(UsersController);
    expect(service).toBeInstanceOf(UsersService);
  });
});
