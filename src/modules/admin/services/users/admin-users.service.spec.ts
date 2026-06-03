import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { NotFoundException } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { User } from '@/modules/users/models/user.model';

describe('AdminUsersService', () => {
  let service: AdminUsersService;

  interface UserModelMock {
    findAll: jest.Mock;
    findByPk: jest.Mock;
    update: jest.Mock;
  }

  let modelMock: UserModelMock;

  const mockUser = {
    id: 1,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    is_worker_active: true,
    is_employer_active: false,
    is_admin_active: false,
    created_at: new Date(),
  } as unknown as User;

  beforeEach(async () => {
    modelMock = {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        {
          provide: getModelToken(User),
          useValue: modelMock,
        },
      ],
    }).compile();

    service = module.get<AdminUsersService>(AdminUsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsersForAdmin', () => {
    it('should call findAll with an empty where clause when filter is "all"', async () => {
      modelMock.findAll.mockResolvedValue([mockUser]);

      const result = await service.getUsersForAdmin('all');

      expect(modelMock.findAll).toHaveBeenCalledWith({
        where: {},
        attributes: [
          'id',
          'first_name',
          'last_name',
          'email',
          'is_worker_active',
          'is_employer_active',
          'is_admin_active',
          'created_at',
        ],
        order: [['created_at', 'DESC']],
      });
      expect(result).toEqual([mockUser]);
    });

    it('should call findAll with is_worker_active true when filter is "workers"', async () => {
      modelMock.findAll.mockResolvedValue([mockUser]);

      await service.getUsersForAdmin('workers');

      expect(modelMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { is_worker_active: true },
        }),
      );
    });

    it('should call findAll with is_employer_active true when filter is "companies"', async () => {
      modelMock.findAll.mockResolvedValue([]);

      await service.getUsersForAdmin('companies');

      expect(modelMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { is_employer_active: true },
        }),
      );
    });

    it('should call findAll with is_admin_active true when filter is "admins"', async () => {
      modelMock.findAll.mockResolvedValue([]);

      await service.getUsersForAdmin('admins');

      expect(modelMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { is_admin_active: true },
        }),
      );
    });
  });

  describe('updateUserForAdmin', () => {
    const updateData = { first_name: 'Jane', is_admin_active: true } as Partial<User>;

    it('should update and return the updated user successfully', async () => {
      const updatedUserInstance = { ...mockUser, ...updateData } as User;

      modelMock.findByPk.mockResolvedValueOnce(mockUser);
      modelMock.update.mockResolvedValue([1]);
      modelMock.findByPk.mockResolvedValueOnce(updatedUserInstance);

      const result = await service.updateUserForAdmin(1, updateData);

      expect(modelMock.findByPk).toHaveBeenNthCalledWith(1, 1);
      expect(modelMock.update).toHaveBeenCalledWith(updateData, { where: { id: 1 } });
      expect(modelMock.findByPk).toHaveBeenNthCalledWith(2, 1, {
        attributes: [
          'id',
          'first_name',
          'last_name',
          'email',
          'is_worker_active',
          'is_employer_active',
          'is_admin_active',
          'created_at',
        ],
      });
      expect(result).toEqual(updatedUserInstance);
    });

    it('should throw a NotFoundException if the user to update does not exist', async () => {
      modelMock.findByPk.mockResolvedValueOnce(null);

      await expect(service.updateUserForAdmin(999, updateData)).rejects.toThrow(NotFoundException);
      expect(modelMock.update).not.toHaveBeenCalled();
    });

    it('should throw a NotFoundException if the user cannot be retrieved after update', async () => {
      modelMock.findByPk.mockResolvedValueOnce(mockUser);
      modelMock.update.mockResolvedValue([1]);
      modelMock.findByPk.mockResolvedValueOnce(null);

      await expect(service.updateUserForAdmin(1, updateData)).rejects.toThrow(NotFoundException);
    });
  });
});
