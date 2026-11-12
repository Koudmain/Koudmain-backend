import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PostPublicationDto } from '@/modules/publication/models/publication.model';

const errorsFor = async (dates: { starting_date: string; ending_date: string }) => {
  const dto = plainToInstance(PostPublicationDto, {
    companyId: 1,
    title: 'Serveur',
    hourly_rate: 15,
    ...dates,
  });
  const errors = await validate(dto);
  return errors.map((error) => error.property);
};

describe('PostPublicationDto dates', () => {
  it('should accept UTC and offset dates', async () => {
    await expect(
      errorsFor({
        starting_date: '2026-08-01T16:00:00.000Z',
        ending_date: '2026-08-01T20:00:00+02:00',
      }),
    ).resolves.toEqual([]);
  });

  it('should reject a local date without time zone', async () => {
    await expect(
      errorsFor({ starting_date: '2026-08-01T18:00:00', ending_date: '2026-08-01T22:00:00' }),
    ).resolves.toEqual(['starting_date', 'ending_date']);
  });

  it('should reject a value that is not a date', async () => {
    await expect(
      errorsFor({ starting_date: 'demain', ending_date: '2026-08-01T22:00:00Z' }),
    ).resolves.toEqual(['starting_date']);
  });
});
