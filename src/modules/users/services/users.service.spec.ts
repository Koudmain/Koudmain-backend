import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/sequelize';
import { User } from '@/modules/users/models/user.model';
import { Transaction, col, fn, where } from 'sequelize';

describe('UsersService', () => {
  let service: UsersService;

  const mockUserModel = {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    max: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = moduleRef.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOneByIdPublic', () => {
    it('should find user and exclude password', async () => {
      const mockUser = { id: 1, email: 'test@test.com' };
      mockUserModel.findByPk.mockResolvedValue(mockUser);

      const result = await service.findOneByIdPublic(1);

      expect(mockUserModel.findByPk).toHaveBeenCalledWith(1, {
        attributes: { exclude: ['password'] },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('create', () => {
    it('should auto-increment ID if not provided', async () => {
      mockUserModel.max.mockResolvedValue(10);
      mockUserModel.create.mockImplementation((data) => Promise.resolve(data));

      const userData = { email: 'new@test.com' };
      const result = await service.create(userData);

      expect(mockUserModel.max).toHaveBeenCalledWith('id');
      expect(result.id).toBe(11);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should use provided ID if present', async () => {
      mockUserModel.create.mockImplementation((data) => Promise.resolve(data));

      const userData = { id: 99, email: 'explicit@test.com' };
      const result = await service.create(userData);

      expect(mockUserModel.max).not.toHaveBeenCalled();
      expect(result.id).toBe(99);
    });

    it('should pass down the transaction option', async () => {
      mockUserModel.max.mockResolvedValue(0);

      // Remplacement de {} as any par le type Transaction de Sequelize
      const fakeTransaction = {} as Transaction;

      await service.create({ email: 'tx@test.com' }, { transaction: fakeTransaction });

      expect(mockUserModel.create).toHaveBeenCalledWith(expect.any(Object), {
        transaction: fakeTransaction,
      });
    });
  });

  describe('findAll', () => {
    it('should never return password hashes', async () => {
      await service.findAll();

      expect(mockUserModel.findAll).toHaveBeenCalledWith({ attributes: { exclude: ['password'] } });
    });
  });

  describe('findOneByEmail', () => {
    it('should match the email regardless of case', async () => {
      await service.findOneByEmail('John.Doe@Gmail.com');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        where: where(fn('lower', col('email')), 'john.doe@gmail.com'),
      });
    });
  });

  describe('markEmailAsVerified', () => {
    it('should update email_verified_at fields', async () => {
      mockUserModel.update.mockResolvedValue([1]);

      await service.markEmailAsVerified(42);

      expect(mockUserModel.update).toHaveBeenCalledWith(
        { email_verified_at: expect.any(Date) },
        { where: { id: 42 } },
      );
    });
  });
});
