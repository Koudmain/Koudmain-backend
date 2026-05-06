import request from 'supertest';
import { INestApplication } from '@nestjs/common';

interface AuthResponse {
  access_token: string;
}

export async function getAuthToken(app: INestApplication, email: string) {
  await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password: 'Password123!', first_name: 'Test', last_name: 'User' });

  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: 'Password123!' });

  const body = response.body as AuthResponse;
  return body.access_token;
}
