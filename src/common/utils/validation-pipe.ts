import { ValidationPipe } from '@nestjs/common';

// Shared by main.ts and the e2e tests so both validate requests the same way.
export const createValidationPipe = () =>
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
