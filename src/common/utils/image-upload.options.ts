import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

// Uploads are buffered in memory: cap the size (413 above it) and only accept images.
export const imageUploadOptions: MulterOptions = {
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (request, file, callback) => {
    if (file.mimetype.startsWith('image/')) return callback(null, true);
    callback(new BadRequestException('Le fichier doit être une image'), false);
  },
};
