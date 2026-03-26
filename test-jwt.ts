import { JwtSignOptions } from '@nestjs/jwt';
const accessExpiresIn: string = '15m';
const options: JwtSignOptions = { expiresIn: accessExpiresIn as JwtSignOptions['expiresIn'] };
