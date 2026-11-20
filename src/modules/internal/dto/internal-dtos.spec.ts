import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GetDeviceTokensQueryDto } from './get-device-tokens.query.dto';
import { CreateNotificationDeliveryDto } from './create-notification-delivery.dto';

describe('Internal DTOs', () => {
  describe('GetDeviceTokensQueryDto', () => {
    const toDto = (userIds: unknown) => plainToInstance(GetDeviceTokensQueryDto, { userIds });

    it('should parse a comma separated list of user ids', async () => {
      const dto = toDto('1, 2,3,');
      expect(dto.userIds).toEqual([1, 2, 3]);
      expect(await validate(dto)).toHaveLength(0);
    });

    it('should reject non numeric user ids', async () => {
      expect(await validate(toDto('1,abc'))).not.toHaveLength(0);
    });

    it('should reject an empty list', async () => {
      expect(await validate(toDto(''))).not.toHaveLength(0);
    });

    it('should reject a missing userIds parameter', async () => {
      expect(await validate(toDto(undefined))).not.toHaveLength(0);
    });
  });

  describe('CreateNotificationDeliveryDto', () => {
    const validBody = {
      outboxEventId: 123,
      applicationId: null,
      userId: 1,
      platform: 'IOS',
      channel: 'Push',
      status: 'Sent',
      errorMessage: null,
    };

    it('should accept a valid body with nullable fields set to null', async () => {
      const dto = plainToInstance(CreateNotificationDeliveryDto, validBody);
      expect(await validate(dto)).toHaveLength(0);
    });

    it('should reject an unknown status', async () => {
      const dto = plainToInstance(CreateNotificationDeliveryDto, {
        ...validBody,
        status: 'Pending',
      });
      const errors = await validate(dto);
      expect(errors.map((error) => error.property)).toEqual(['status']);
    });

    it('should reject a missing userId', async () => {
      const dto = plainToInstance(CreateNotificationDeliveryDto, {
        ...validBody,
        userId: undefined,
      });
      const errors = await validate(dto);
      expect(errors.map((error) => error.property)).toEqual(['userId']);
    });
  });
});
