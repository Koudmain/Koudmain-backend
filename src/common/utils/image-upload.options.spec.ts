import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { imageUploadOptions } from '@/common/utils/image-upload.options';

describe('imageUploadOptions', () => {
  const filter = (mimetype: string) =>
    new Promise<{ error: Error | null; accepted: boolean }>((resolve) =>
      imageUploadOptions.fileFilter!(
        {} as Request,
        { mimetype } as Express.Multer.File,
        (error: Error | null, accepted: boolean) => resolve({ error, accepted }),
      ),
    );

  it('should cap uploads at 10 MB', () => {
    expect(imageUploadOptions.limits?.fileSize).toBe(10 * 1024 * 1024);
  });

  it('should accept images', async () => {
    await expect(filter('image/jpeg')).resolves.toEqual({ error: null, accepted: true });
  });

  it('should reject other files', async () => {
    const { error, accepted } = await filter('application/pdf');

    expect(accepted).toBe(false);
    expect(error).toBeInstanceOf(BadRequestException);
  });
});
