import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { UserRole } from '@/modules/users/models/user.model';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export async function getAuthTokenForEmployer(app: INestApplication, email: string) {
  await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      email,
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '0600000000',
      birthDate: '1990-01-01',
      role: UserRole.EMPLOYER,
      employerProfile: {
        companyName: 'Company Name',
        establishmentType: 'Restaurant',
        ownerPosition: 'MANAGER',
        desiredTradeIds: [1],
      },
    });

  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: 'Password123!' });

  const body = response.body as AuthResponse;
  return body.accessToken;
}

export async function getAuthTokenForWorker(app: INestApplication, email: string) {
  await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      email,
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '0600000000',
      birthDate: '1990-01-01',
      role: UserRole.WORKER,
      workerProfile: {
        skillCategoryIds: [1],
      },
    });

  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: 'Password123!' });

  const body = response.body as AuthResponse;
  return body.accessToken;
}
