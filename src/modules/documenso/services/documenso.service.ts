import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import {
  CreateEnvelopeInput,
  DistributedEnvelope,
  DocumensoEnvelope,
  DocumensoSigner,
} from '@/modules/documenso/documenso.types';

@Injectable()
export class DocumensoService {
  constructor(private readonly configService: ConfigService) {}

  async createEnvelope(input: CreateEnvelopeInput): Promise<string> {
    const payload = {
      type: 'DOCUMENT',
      title: input.title,
      externalId: input.externalId,
      recipients: input.signers.map((signer) => ({ ...signer, role: 'SIGNER' })),
      meta: {
        distributionMethod: 'NONE',
        signingOrder: 'PARALLEL',
        language: 'fr',
        timezone: 'Europe/Paris',
        dateFormat: 'dd/MM/yyyy',
      },
    };
    const formData = new FormData();
    formData.append('payload', JSON.stringify(payload));
    formData.append(
      'files',
      new Blob([new Uint8Array(input.pdf)], { type: 'application/pdf' }),
      input.filename,
    );

    const { id } = await this.request<{ id: string }>('POST', '/envelope/create', formData);

    return id;
  }

  async distribute(envelopeId: string): Promise<DistributedEnvelope> {
    const { recipients } = await this.request<{
      recipients: DistributedEnvelope['recipients'];
    }>('POST', '/envelope/distribute', { envelopeId });

    return { envelopeId, recipients };
  }

  async getEnvelope(envelopeId: string): Promise<DocumensoEnvelope> {
    return this.request<DocumensoEnvelope>('GET', `/envelope/${encodeURIComponent(envelopeId)}`);
  }

  async downloadSigned(envelopeItemId: string): Promise<Buffer> {
    const response = await this.send(
      'GET',
      `/envelope/item/${encodeURIComponent(envelopeItemId)}/download?version=signed`,
    );

    return Buffer.from(await response.arrayBuffer());
  }

  async updateSigner(envelopeId: string, recipientId: number, signer: DocumensoSigner) {
    await this.request('POST', '/envelope/recipient/update-many', {
      envelopeId,
      data: [{ id: recipientId, ...signer }],
    });
  }

  async deleteEnvelope(envelopeId: string): Promise<void> {
    await this.request('POST', '/envelope/delete', { envelopeId });
  }

  signingUrl(token: string): string {
    return `${this.config('DOCUMENSO_PUBLIC_URL')}/sign/${token}`;
  }

  isValidWebhookSecret(secret: string | undefined): boolean {
    const digest = (value: string) => createHash('sha256').update(value).digest();

    return (
      secret !== undefined &&
      timingSafeEqual(digest(secret), digest(this.config('DOCUMENSO_WEBHOOK_SECRET')))
    );
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: object): Promise<T> {
    const response = await this.send(method, path, body);

    return (await response.json()) as T;
  }

  private async send(method: 'GET' | 'POST', path: string, body?: object): Promise<Response> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config('DOCUMENSO_API_KEY')}`,
    };
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';

    let response: Response;
    try {
      response = await fetch(`${this.config('DOCUMENSO_API_URL')}${path}`, {
        method,
        headers,
        body: body instanceof FormData ? body : body && JSON.stringify(body),
      });
    } catch (error) {
      throw new BadGatewayException(`Documenso injoignable: ${(error as Error).message}`);
    }

    if (!response.ok) {
      const detail = await response.text();
      const message = `Documenso a refusé ${method} ${path} (${response.status}): ${detail}`;

      throw response.status < 500
        ? new BadRequestException(message)
        : new BadGatewayException(message);
    }

    return response;
  }

  private config(key: string): string {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new ServiceUnavailableException(`Signature électronique non configurée: ${key} absent`);
    }
    return value;
  }
}
