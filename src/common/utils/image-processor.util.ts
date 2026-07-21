import sharp from 'sharp';

export const processProfilePicture = async (buffer: Buffer): Promise<Buffer> => {
  return sharp(buffer)
    .resize(500, 500, {
      fit: 'cover',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toBuffer();
};
