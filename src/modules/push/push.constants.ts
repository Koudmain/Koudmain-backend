export const FIREBASE_APP = 'FIREBASE_APP';
export const APNS_PROVIDER = 'APNS_PROVIDER';

// FCMs' error name
export enum FcmInvalidTokenErrorCode {
  INVALID_REGISTRATION_TOKEN = 'messaging/invalid-registration-token',
  REGISTRATION_TOKEN_NOT_REGISTERED = 'messaging/registration-token-not-registered',
}

// APNs' error name
export enum ApnsInvalidTokenReason {
  BAD_DEVICE_TOKEN = 'BadDeviceToken',
  UNREGISTERED = 'Unregistered',
  DEVICE_TOKEN_NOT_FOR_TOPIC = 'DeviceTokenNotForTopic',
}

export const FCM_INVALID_TOKEN_ERROR_CODES: ReadonlySet<string> = new Set(
  Object.values(FcmInvalidTokenErrorCode),
);

export const APNS_INVALID_TOKEN_REASONS: ReadonlySet<string> = new Set(
  Object.values(ApnsInvalidTokenReason),
);
