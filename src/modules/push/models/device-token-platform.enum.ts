// Fichier sans import : device-token.model est dans un cycle d'import
// (user → review → mission → publication → application → notification-delivery).
export enum DeviceTokenPlatform {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
}
