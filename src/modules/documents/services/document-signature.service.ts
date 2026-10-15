import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { createHash } from 'crypto';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Document } from '@/modules/documents/models/document.model';
import { Contract, ContractStatus } from '@/modules/documents/models/contract.model';
import {
  SignatureEnvelope,
  SignatureProvider,
  SignatureStatus,
} from '@/modules/documents/models/signature-envelope.model';
import { DocumentsService } from '@/modules/documents/services/document.service';
import {
  DocumentAccessService,
  DocumentActor,
  Parties,
} from '@/modules/documents/services/document-access.service';
import { DocumensoService } from '@/modules/documenso/services/documenso.service';
import {
  DocumensoSigner,
  DocumensoWebhookEvent,
  DocumensoWebhookPayload,
} from '@/modules/documenso/documenso.types';
import { S3Service } from '@/modules/s3/services/s3.service';
import { StorageCategory, StoredObjectRef } from '@/modules/s3/s3.types';

export interface SignatureLink {
  url: string;
}

type SignerSide = 'worker' | 'employer';

const OPEN_STATUSES: ReadonlySet<SignatureStatus> = new Set([
  SignatureStatus.PENDING,
  SignatureStatus.PARTIALLY_SIGNED,
]);

@Injectable()
export class DocumentSignatureService {
  private readonly logger = new Logger(DocumentSignatureService.name);

  constructor(
    private sequelize: Sequelize,
    private readonly documentsService: DocumentsService,
    private readonly accessService: DocumentAccessService,
    private readonly documensoService: DocumensoService,
    private readonly s3Service: S3Service,
    @InjectModel(Document) private documentModel: typeof Document,
    @InjectModel(Contract) private contractModel: typeof Contract,
    @InjectModel(SignatureEnvelope) private signatureEnvelopeModel: typeof SignatureEnvelope,
  ) {}

  async requestSignature(userId: number, documentId: number): Promise<SignatureLink> {
    const actor = await this.accessService.resolveActor(userId);
    const document = await this.documentsService.findOne(userId, documentId);
    const parties = await this.contractParties(document);

    if (!DocumentAccessService.isCompanySide(actor, parties)) {
      throw new ForbiddenException(
        "Seule l'entreprise de la mission peut envoyer ce contrat en signature",
      );
    }
    if (document.mimeType !== 'application/pdf') {
      throw new BadRequestException('Seul un contrat au format PDF peut être signé');
    }

    const worker = await this.workerSigner(parties.workerId!);
    const employer = await this.userSigner(userId);

    if (sameEmail(worker.email, employer.email)) {
      throw new BadRequestException(
        "Le worker et le signataire de l'entreprise doivent avoir des e-mails différents",
      );
    }

    await this.claimDraft(documentId);

    let envelopeId: string | undefined;
    try {
      const { versionId } = (await this.documentModel.findByPk(documentId))!;
      const { body } = await this.s3Service.getBytes(contractRef(documentId), versionId);

      envelopeId = await this.documensoService.createEnvelope({
        title: document.name,
        externalId: String(documentId),
        pdf: body,
        filename: document.originalFilename ?? `contrat-${documentId}.pdf`,
        signers: [worker, employer],
      });

      const { recipients } = await this.documensoService.distribute(envelopeId);
      const workerRecipient = recipients.find((r) => sameEmail(r.email, worker.email));
      const employerRecipient = recipients.find((r) => sameEmail(r.email, employer.email));

      if (!workerRecipient || !employerRecipient) {
        throw new ConflictException('Documenso n’a pas renvoyé les deux signataires attendus');
      }

      await this.sequelize.transaction(async (transaction) => {
        await this.signatureEnvelopeModel.destroy({ where: { documentId }, transaction });
        await this.signatureEnvelopeModel.create(
          {
            documentId,
            provider: SignatureProvider.DOCUMENSO,
            externalDocumentId: envelopeId!,
            status: SignatureStatus.PENDING,
          },
          { transaction },
        );
        await this.contractModel.update(
          {
            workerSignatureId: String(workerRecipient.id),
            employerSignatureId: String(employerRecipient.id),
          },
          { where: { documentId }, transaction },
        );
      });

      return { url: this.documensoService.signingUrl(employerRecipient.token) };
    } catch (error) {
      await this.releaseDraft(documentId);
      if (envelopeId) await this.discardEnvelope(envelopeId);
      throw error;
    }
  }

  async getSigningLink(userId: number, documentId: number): Promise<SignatureLink> {
    const actor = await this.accessService.resolveActor(userId);
    const document = await this.documentsService.findOne(userId, documentId);
    const parties = await this.contractParties(document);
    const envelope = document.signatureEnvelope;

    if (!envelope || !OPEN_STATUSES.has(envelope.status)) {
      throw new ConflictException("Ce contrat n'est pas en attente de signature");
    }

    const remote = await this.documensoService.getEnvelope(envelope.externalDocumentId);
    const sides = signerSides(actor, parties);

    if (sides.length === 0) {
      throw new ForbiddenException('Vous ne participez pas à cette mission');
    }

    for (const side of sides) {
      const recipientId = Number(
        side === 'worker'
          ? document.contract.workerSignatureId
          : document.contract.employerSignatureId,
      );
      const recipient = remote.recipients.find((r) => r.id === recipientId);

      if (!recipient) {
        throw new NotFoundException('Signataire introuvable dans Documenso');
      }
      if (recipient.signingStatus !== 'NOT_SIGNED') continue;

      if (side === 'employer') {
        const signer = await this.userSigner(userId);

        if (!sameEmail(recipient.email, signer.email)) {
          await this.documensoService.updateSigner(remote.id, recipient.id, signer);
        }
      }

      return { url: this.documensoService.signingUrl(recipient.token) };
    }

    throw new ConflictException('Ce contrat a déjà été signé de votre côté');
  }

  async handleWebhook(webhook: DocumensoWebhookPayload): Promise<void> {
    const envelopeId = webhook?.payload?.envelopeId;

    if (!envelopeId) {
      throw new BadRequestException('Webhook Documenso sans envelopeId');
    }

    const envelope = await this.signatureEnvelopeModel.findOne({
      where: { externalDocumentId: envelopeId },
    });

    if (!envelope) {
      this.logger.warn(`Webhook ${webhook.event} ignoré: enveloppe ${envelopeId} inconnue`);
      return;
    }

    switch (webhook.event as DocumensoWebhookEvent) {
      case DocumensoWebhookEvent.DOCUMENT_SIGNED:
      case DocumensoWebhookEvent.DOCUMENT_RECIPIENT_COMPLETED:
        await this.signatureEnvelopeModel.update(
          { status: SignatureStatus.PARTIALLY_SIGNED },
          { where: { id: envelope.id, status: SignatureStatus.PENDING } },
        );
        return;
      case DocumensoWebhookEvent.DOCUMENT_COMPLETED:
        return this.complete(envelope);
      case DocumensoWebhookEvent.DOCUMENT_REJECTED:
      case DocumensoWebhookEvent.DOCUMENT_CANCELLED:
        return this.abandon(envelope);
      default:
        return;
    }
  }

  private async complete(envelope: SignatureEnvelope): Promise<void> {
    if (envelope.status === SignatureStatus.COMPLETED) return;

    const remote = await this.documensoService.getEnvelope(envelope.externalDocumentId);

    if (remote.status !== 'COMPLETED') {
      this.logger.warn(`Enveloppe ${remote.id} annoncée complète mais au statut ${remote.status}`);
      return;
    }

    const [item] = [...remote.envelopeItems].sort((a, b) => a.order - b.order);
    const pdf = await this.documensoService.downloadSigned(item.id);
    const sealed = await this.s3Service.seal(contractRef(envelope.documentId), pdf);

    await this.sequelize.transaction(async (transaction) => {
      await this.documentModel.update(
        {
          versionId: sealed.versionId,
          checksumSha256: sealed.checksum ?? createHash('sha256').update(pdf).digest('hex'),
          sizeBytes: pdf.length,
          mimeType: 'application/pdf',
        },
        { where: { id: envelope.documentId }, transaction },
      );
      await this.contractModel.update(
        {
          status: ContractStatus.SIGNED,
          signedAt: remote.completedAt ? new Date(remote.completedAt) : new Date(),
        },
        { where: { documentId: envelope.documentId }, transaction },
      );
      await envelope.update({ status: SignatureStatus.COMPLETED }, { transaction });
    });
  }

  private async abandon(envelope: SignatureEnvelope): Promise<void> {
    if (!OPEN_STATUSES.has(envelope.status)) return;

    await this.sequelize.transaction(async (transaction) => {
      await envelope.update({ status: SignatureStatus.DECLINED }, { transaction });
      await this.contractModel.update(
        { status: ContractStatus.PENDING, workerSignatureId: null, employerSignatureId: null },
        {
          where: { documentId: envelope.documentId, status: ContractStatus.AWAITING_SIGNATURE },
          transaction,
        },
      );
    });
  }

  private async contractParties(document: Document): Promise<Parties> {
    if (!document.contract) {
      throw new BadRequestException('Seul un contrat peut être signé');
    }

    const parties = await this.accessService.missionParties(document.contract.missionId);

    if (!parties || parties.workerId === null) {
      throw new NotFoundException('Mission du contrat introuvable');
    }
    return parties;
  }

  private async claimDraft(documentId: number): Promise<void> {
    const [claimed] = await this.contractModel.update(
      { status: ContractStatus.AWAITING_SIGNATURE },
      {
        where: {
          documentId,
          signedAt: null,
          status: { [Op.or]: [ContractStatus.PENDING, null] },
        },
      },
    );

    if (claimed === 0) {
      throw new ConflictException(
        "Ce contrat n'est plus un brouillon: il ne peut pas être envoyé en signature",
      );
    }
  }

  private async releaseDraft(documentId: number): Promise<void> {
    await this.contractModel.update(
      { status: ContractStatus.PENDING },
      { where: { documentId, status: ContractStatus.AWAITING_SIGNATURE } },
    );
  }

  private async discardEnvelope(envelopeId: string): Promise<void> {
    try {
      await this.documensoService.deleteEnvelope(envelopeId);
    } catch (error) {
      this.logger.error(`Enveloppe Documenso ${envelopeId} non supprimée`, error as Error);
    }
  }

  private async workerSigner(workerId: number): Promise<DocumensoSigner> {
    return this.signer(
      `SELECT u.email, u.first_name AS "firstName", u.last_name AS "lastName"
       FROM "worker_profile" w JOIN "user" u ON u.id = w.user_id WHERE w.id = :id`,
      workerId,
    );
  }

  private async userSigner(userId: number): Promise<DocumensoSigner> {
    return this.signer(
      `SELECT email, first_name AS "firstName", last_name AS "lastName" FROM "user" WHERE id = :id`,
      userId,
    );
  }

  private async signer(sql: string, id: number): Promise<DocumensoSigner> {
    const [rows] = await this.sequelize.query(sql, { replacements: { id } });
    const row = (rows as Array<{ email: string; firstName: string; lastName: string }>)[0];

    if (!row) {
      throw new NotFoundException('Signataire introuvable');
    }
    return { email: row.email, name: `${row.firstName} ${row.lastName}`.trim() };
  }
}

function contractRef(documentId: number): StoredObjectRef {
  return { category: StorageCategory.CONTRACT, documentId };
}

function sameEmail(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function signerSides(actor: DocumentActor, parties: Parties): SignerSide[] {
  const sides: SignerSide[] = [];

  if (parties.workerId !== null && parties.workerId === actor.workerId) sides.push('worker');
  if (DocumentAccessService.isCompanySide(actor, parties)) sides.push('employer');
  return sides;
}
