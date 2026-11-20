import { Inject, Injectable, Logger } from '@nestjs/common';
import type { App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import * as apn from '@parse/node-apn';
import { ConfigService } from '@nestjs/config';
import {
  FIREBASE_APP,
  APNS_PROVIDER,
  FCM_INVALID_TOKEN_ERROR_CODES,
  APNS_INVALID_TOKEN_REASONS,
} from '@/modules/push/push.constants';
import { DeviceToken, DeviceTokenPlatform } from '@/modules/push/models/device-token.model';

export interface PushPayload {
  title: string;
  body: string;
  collapseId: string;
  data?: Record<string, string>;
}

export interface PushResult {
  success: boolean;
  invalidToken: boolean; // true if uninstall or invalid token
  error?: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @Inject(FIREBASE_APP) private readonly firebaseApp: App,
    @Inject(APNS_PROVIDER) private readonly apnsProvider: apn.Provider,
    private readonly configService: ConfigService,
  ) {}

  async sendPush(deviceToken: DeviceToken, payload: PushPayload): Promise<PushResult> {
    if (deviceToken.platform === DeviceTokenPlatform.ANDROID) {
      return this.sendFcm(deviceToken.token, payload);
    }
    return this.sendApns(deviceToken.token, payload);
  }

  private async sendFcm(token: string, payload: PushPayload): Promise<PushResult> {
    try {
      await getMessaging(this.firebaseApp).send({
        token,
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
        android: { collapseKey: payload.collapseId },
      });
      return { success: true, invalidToken: false };
    } catch (err) {
      const code = (err as { code?: string }).code ?? 'unknown';
      const invalidToken = FCM_INVALID_TOKEN_ERROR_CODES.has(code);
      this.logger.error(`FCM push failed for token (invalidToken=${invalidToken}): ${code}`, err);
      return { success: false, invalidToken, error: code };
    }
  }

  private async sendApns(token: string, payload: PushPayload): Promise<PushResult> {
    const notification = new apn.Notification();
    notification.topic = this.configService.get<string>('APNS_BUNDLE_ID') ?? '';
    notification.alert = { title: payload.title, body: payload.body };
    notification.collapseId = payload.collapseId;
    notification.payload = payload.data ?? {};

    const response = await this.apnsProvider.send(notification, token);

    if (response.sent.length > 0) {
      return { success: true, invalidToken: false };
    }

    const failure = response.failed[0];
    const reason = failure?.response?.reason ?? failure?.error?.message ?? 'unknown';
    const invalidToken = APNS_INVALID_TOKEN_REASONS.has(reason);
    this.logger.error(`APNs push failed for token (invalidToken=${invalidToken}): ${reason}`);
    return { success: false, invalidToken, error: reason };
  }
}
