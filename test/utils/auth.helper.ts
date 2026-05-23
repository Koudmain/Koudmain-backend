import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { User, UserRole } from '@/modules/users/models/user.model';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

export async function getAuthTokenForEmployer(app: INestApplication, email: string) {
  await request(app.getHttpServer()).post('/auth/register').send({
    email,
    password: 'Password123!',
    first_name: 'Test',
    last_name: 'User',
    role: UserRole.EMPLOYER,
  });

  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: 'Password123!', targetApp: 'employer' });

  const body = response.body as AuthResponse;
  return body.access_token;
}

export async function getAuthTokenForWorker(app: INestApplication, email: string) {
  await request(app.getHttpServer()).post('/auth/register').send({
    email,
    password: 'Password123!',
    first_name: 'Test',
    last_name: 'User',
    role: UserRole.WORKER,
  });

  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: 'Password123!', targetApp: 'worker' });

  const body = response.body as AuthResponse;
  return body.access_token;
}
