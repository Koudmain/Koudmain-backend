import request from 'supertest';
import { INestApplication } from '@nestjs/common';

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
    is_employer_active: true,
  });

  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: 'Password123!' });

  const body = response.body as AuthResponse;
  return body.access_token;
}

export async function getAuthTokenForWorker(app: INestApplication, email: string) {
  await request(app.getHttpServer()).post('/auth/register').send({
    email,
    password: 'Password123!',
    first_name: 'Test',
    last_name: 'User',
    is_worker_active: true,
  });

  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: 'Password123!' });

  const body = response.body as AuthResponse;
  return body.access_token;
}
