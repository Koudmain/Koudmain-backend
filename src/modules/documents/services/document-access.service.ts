import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

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
  constructor(private readonly sequelize: Sequelize) {}

  async resolveActor(userId: number): Promise<DocumentActor> {
    const [rows] = await this.sequelize.query(
      `SELECT
        (SELECT id FROM worker_profile WHERE user_id = :userId LIMIT 1) AS "workerId",
        ARRAY(SELECT company_id FROM company_member WHERE user_id = :userId) AS "companyIds"`,
      { replacements: { userId } },
    );
    const row = (rows as Array<{ workerId: number | null; companyIds: number[] }>)[0];

    return { userId, workerId: row.workerId, companyIds: row.companyIds ?? [] };
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
    return this.parties('mission', missionId, transaction);
  }

  async conversationParties(
    conversationId: number,
    transaction?: Transaction,
  ): Promise<Parties | null> {
    return this.parties('conversation', conversationId, transaction);
  }

  async publicationCompanyId(
    publicationId: number,
    transaction?: Transaction,
  ): Promise<number | null> {
    const [rows] = await this.sequelize.query(
      `SELECT company_id AS "companyId" FROM "publication" WHERE id = :publicationId`,
      { replacements: { publicationId }, transaction },
    );

    return (rows as Array<{ companyId: number | null }>)[0]?.companyId ?? null;
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

  private async parties(
    table: 'mission' | 'conversation',
    id: number,
    transaction?: Transaction,
  ): Promise<Parties | null> {
    const [rows] = await this.sequelize.query(
      `SELECT worker_id AS "workerId", company_id AS "companyId" FROM "${table}" WHERE id = :id`,
      { replacements: { id }, transaction },
    );

    return (rows as Parties[])[0] ?? null;
  }

  private static sqlInt(value: number): string {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`Identifiant invalide dans une règle d'accès: ${value}`);
    }
    return String(value);
  }
}
