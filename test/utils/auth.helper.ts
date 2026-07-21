import request from 'supertest';
import { INestApplication } from '@nestjs/common';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export async function getAuthTokenForEmployer(app: INestApplication, email: string) {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: 'password123' });

  const body = response.body as AuthResponse;
  return body.accessToken;
}

export async function getAuthTokenForWorker(app: INestApplication, email: string) {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: 'password123' });

  const body = response.body as AuthResponse;
  return body.accessToken;
}
