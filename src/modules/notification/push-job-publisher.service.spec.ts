import { Test } from '@nestjs/testing';
import { PushJobPublisherService } from './push-job-publisher.service';
import { RedisService } from '@/shared/redis/redis.service';
import { PUSH_JOBS_STREAM_KEY } from '@/shared/push/push-jobs-stream.constants';

describe('PushJobPublisherService', () => {
  let service: PushJobPublisherService;
  let mockRedisService: { publishToStream: jest.Mock };

  const payload = {
    title: 'Nouvelle candidature',
    body: 'Vous avez reçu une nouvelle candidature',
    collapseId: 'publication:10',
    data: { publicationId: '10' },
  };

  beforeEach(async () => {
    mockRedisService = { publishToStream: jest.fn().mockResolvedValue('1-0') };

    const moduleRef = await Test.createTestingModule({
      providers: [PushJobPublisherService, { provide: RedisService, useValue: mockRedisService }],
    }).compile();

    service = moduleRef.get<PushJobPublisherService>(PushJobPublisherService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should publish the push job on the push-jobs stream in a single payload field', async () => {
    await service.publish({
      recipientUserIds: [1, 2, 3],
      payload,
      outboxEventId: 123,
      applicationId: 42,
    });

    expect(PUSH_JOBS_STREAM_KEY).toBe('push-jobs');
    expect(mockRedisService.publishToStream).toHaveBeenCalledTimes(1);
    const [stream, fields] = mockRedisService.publishToStream.mock.calls[0] as [
      string,
      Record<string, string>,
    ];
    expect(stream).toBe('push-jobs');
    expect(Object.keys(fields)).toEqual(['payload']);
    expect(JSON.parse(fields.payload)).toEqual({
      recipientUserIds: [1, 2, 3],
      payload,
      outboxEventId: 123,
      applicationId: 42,
    });
  });

  it('should serialize a missing applicationId as null', async () => {
    await service.publish({ recipientUserIds: [1], payload, outboxEventId: 5 });

    const [, fields] = mockRedisService.publishToStream.mock.calls[0] as [
      string,
      Record<string, string>,
    ];
    expect(JSON.parse(fields.payload)).toEqual(
      expect.objectContaining({ applicationId: null, outboxEventId: 5 }),
    );
  });

  it('should not publish anything when there is no recipient', async () => {
    await service.publish({ recipientUserIds: [], payload, outboxEventId: 5, applicationId: 1 });

    expect(mockRedisService.publishToStream).not.toHaveBeenCalled();
  });

  it('should propagate Redis errors so the outbox event is retried', async () => {
    mockRedisService.publishToStream.mockRejectedValue(new Error('redis down'));

    await expect(
      service.publish({ recipientUserIds: [1], payload, outboxEventId: 5, applicationId: 1 }),
    ).rejects.toThrow('redis down');
  });
});
