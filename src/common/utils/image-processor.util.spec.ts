import { processProfilePicture } from './image-processor.util';

describe('ImageProcessorUtil', () => {
  it('should process an image and return a buffer', async () => {
    const validImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );

    const result = await processProfilePicture(validImageBuffer);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });
});
