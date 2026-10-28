import sharp from 'sharp';

export const processProfilePicture = async (
  buffer: Buffer,
  width = 500,
  height = 500,
): Promise<Buffer> => {
  return sharp(buffer)
    .resize(width, height, {
      fit: 'cover',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toBuffer();
};
