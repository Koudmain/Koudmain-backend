import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { Mission } from '@/modules/missions/mission.model';
import { Conversation } from '@/modules/chat/models/conversation.model';

export interface DocumentActor {
  userId: number;
  workerId: number | null;
  companyIds: number[];
}

export interface Parties {
  workerId: number | null;
  companyId: number | null;
}

@Injectable()
export class DocumentAccessService {
  constructor(
    private readonly sequelize: Sequelize,
    @InjectModel(WorkerProfile) private workerProfileModel: typeof WorkerProfile,
    @InjectModel(CompanyMember) private companyMemberModel: typeof CompanyMember,
    @InjectModel(Publication) private publicationModel: typeof Publication,
    @InjectModel(Mission) private missionModel: typeof Mission,
    @InjectModel(Conversation) private conversationModel: typeof Conversation,
  ) {}

  async resolveActor(userId: number): Promise<DocumentActor> {
    const [worker, memberships] = await Promise.all([
      this.workerProfileModel.findOne({ where: { userId }, attributes: ['id'] }),
      this.companyMemberModel.findAll({ where: { userId }, attributes: ['companyId'] }),
    ]);

    return {
      userId,
      workerId: worker?.id ?? null,
      companyIds: memberships.map((member) => member.companyId),
    };
  }

  readableDocumentIds(actor: DocumentActor): string {
    const userId = DocumentAccessService.sqlInt(actor.userId);
    const workerId =
      actor.workerId === null ? 'NULL' : DocumentAccessService.sqlInt(actor.workerId);
    const companyIds = `ARRAY[${actor.companyIds.map(DocumentAccessService.sqlInt).join(',')}]::int[]`;

    return `(
      SELECT d.id FROM "document" d
      LEFT JOIN "document_assignment" a ON a.document_id = d.id
      LEFT JOIN "document_context" c ON c.document_id = d.id
      LEFT JOIN "contract" ct ON ct.document_id = d.id
      LEFT JOIN "invoice" inv ON inv.document_id = d.id
      LEFT JOIN "mission" m ON m.id = coalesce(ct.mission_id, inv.mission_id, c.mission_id)
      LEFT JOIN "conversation" cv ON cv.id = c.conversation_id
      LEFT JOIN "publication" p ON p.id = c.publication_id
      WHERE a.user_id = ${userId}
        OR a.worker_id = ${workerId}
        OR a.company_id = ANY(${companyIds})
        OR m.worker_id = ${workerId}
        OR m.company_id = ANY(${companyIds})
        OR cv.worker_id = ${workerId}
        OR cv.company_id = ANY(${companyIds})
        OR p.company_id = ANY(${companyIds})
    )`;
  }

  async canRead(
    actor: DocumentActor,
    documentId: number,
    transaction?: Transaction,
  ): Promise<boolean> {
    const [rows] = await this.sequelize.query(
      `SELECT 1 FROM "document" WHERE id = :documentId AND id IN ${this.readableDocumentIds(actor)}`,
      { replacements: { documentId }, transaction },
    );

    return rows.length > 0;
  }

  async missionParties(missionId: number, transaction?: Transaction): Promise<Parties | null> {
    const mission = await this.missionModel.findByPk(missionId, {
      attributes: ['workerId', 'companyId'],
      transaction,
    });

    return mission ? DocumentAccessService.toParties(mission) : null;
  }

  async conversationParties(
    conversationId: number,
    transaction?: Transaction,
  ): Promise<Parties | null> {
    const conversation = await this.conversationModel.findByPk(conversationId, {
      attributes: ['workerId', 'companyId'],
      transaction,
    });

    return conversation ? DocumentAccessService.toParties(conversation) : null;
  }

  async publicationCompanyId(
    publicationId: number,
    transaction?: Transaction,
  ): Promise<number | null> {
    const publication = await this.publicationModel.findByPk(publicationId, {
      attributes: ['companyId'],
      transaction,
    });

    return publication?.companyId ?? null;
  }

  static isParty(actor: DocumentActor, parties: Parties): boolean {
    return (
      (parties.workerId !== null && parties.workerId === actor.workerId) ||
      DocumentAccessService.isCompanySide(actor, parties)
    );
  }

  static isCompanySide(actor: DocumentActor, parties: Parties): boolean {
    return parties.companyId !== null && actor.companyIds.includes(parties.companyId);
  }

  private static toParties(row: { workerId: number | null; companyId: number | null }): Parties {
    return { workerId: row.workerId ?? null, companyId: row.companyId ?? null };
  }

  private static sqlInt(value: number): string {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`Identifiant invalide dans une règle d'accès: ${value}`);
    }
    return String(value);
  }
}
