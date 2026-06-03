import { Test, TestingModule } from '@nestjs/testing';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from '@/modules/admin/services/users/admin-users.service';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { AdminRoleGuard } from '@/modules/auth/guards/admin-role.guard';
import { User } from '@/modules/users/models/user.model';
import type { UserFilterType } from '@/modules/admin/services/users/admin-users.service';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;

  interface AdminUsersServiceMock {
    getUsersForAdmin: jest.Mock;
    updateUserForAdmin: jest.Mock;
  }

  let serviceMock: AdminUsersServiceMock;

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

  const mockUsersList = [mockUser];

  beforeEach(async () => {
    serviceMock = {
      getUsersForAdmin: jest.fn(),
      updateUserForAdmin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [
        {
          provide: AdminUsersService,
          useValue: serviceMock,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminUsersController>(AdminUsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllUsers', () => {
    it('should return all users by calling service with "all"', async () => {
      serviceMock.getUsersForAdmin.mockResolvedValue(mockUsersList);

      const result = await controller.getAllUsers();

      expect(serviceMock.getUsersForAdmin).toHaveBeenCalledWith('all');
      expect(result).toEqual(mockUsersList);
    });
  });

  describe('getUsersByFilter', () => {
    it('should return filtered users based on the param type', async () => {
      serviceMock.getUsersForAdmin.mockResolvedValue(mockUsersList);
      const filterType: UserFilterType = 'workers';

      const result = await controller.getUsersByFilter(filterType);

      expect(serviceMock.getUsersForAdmin).toHaveBeenCalledWith(filterType);
      expect(result).toEqual(mockUsersList);
    });
  });

  describe('updateUser', () => {
    it('should convert id param to number and call service update', async () => {
      const updateData = { first_name: 'Jane' } as Partial<User>;
      const updatedUserInstance = { ...mockUser, ...updateData } as unknown as User;

      serviceMock.updateUserForAdmin.mockResolvedValue(updatedUserInstance);

      const stringId = '12';
      const result = await controller.updateUser(stringId, updateData);

      expect(serviceMock.updateUserForAdmin).toHaveBeenCalledWith(12, updateData);
      expect(result).toEqual(updatedUserInstance);
    });
  });
});
