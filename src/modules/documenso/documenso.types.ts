export enum DocumensoWebhookEvent {
  DOCUMENT_SIGNED = 'DOCUMENT_SIGNED',
  DOCUMENT_RECIPIENT_COMPLETED = 'DOCUMENT_RECIPIENT_COMPLETED',
  DOCUMENT_COMPLETED = 'DOCUMENT_COMPLETED',
  DOCUMENT_REJECTED = 'DOCUMENT_REJECTED',
  DOCUMENT_CANCELLED = 'DOCUMENT_CANCELLED',
}

export type DocumensoSigningStatus = 'NOT_SIGNED' | 'SIGNED' | 'REJECTED';

export interface DocumensoSigner {
  email: string;
  name: string;
}

export interface DocumensoRecipient extends DocumensoSigner {
  id: number;
  token: string;
  signingStatus: DocumensoSigningStatus;
  signedAt: string | null;
}

export interface DocumensoEnvelope {
  id: string;
  externalId: string | null;
  status: 'DRAFT' | 'PENDING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  completedAt: string | null;
  recipients: DocumensoRecipient[];
  envelopeItems: Array<{ id: string; order: number }>;
}

export interface CreateEnvelopeInput {
  title: string;
  externalId: string;
  pdf: Buffer;
  filename: string;
  signers: DocumensoSigner[];
}

export interface DistributedEnvelope {
  envelopeId: string;
  recipients: Array<Pick<DocumensoRecipient, 'id' | 'email' | 'token'>>;
}

export interface DocumensoWebhookPayload {
  event: string;
  payload: {
    envelopeId: string;
    externalId: string | null;
    status: string;
  };
}
