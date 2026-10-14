import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { PdfService } from '@/modules/pdf/services/pdf.service';
import { CdduContractData } from '@/modules/pdf/dtos/cddu-data.dto';

interface MissionContractRow {
  finalPrice: string | null;
  jobTitle: string | null;
  missionDescription: string | null;
  hourlyRate: string | null;
  startDate: string | null;
  endDate: string | null;
  totalHours: string | null;
  missionLocation: string | null;
  companyName: string;
  siret: string | null;
  companyAddress: string | null;
  workerFirstName: string;
  workerLastName: string;
  workerBirthDate: string | null;
  workerAddress: string | null;
  representative: string | null;
  createdDate: string;
}

const FULL_ADDRESS = (alias: string) =>
  `CASE WHEN ${alias}.id IS NOT NULL THEN coalesce(${alias}.full_address, concat_ws(', ', concat_ws(' ', ${alias}.street_number, ${alias}.street_name), concat_ws(' ', ${alias}.zip_code, ${alias}.city))) END`;

@Injectable()
export class ContractGenerationService {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly pdfService: PdfService,
  ) {}

  async generateCddu(missionId: number, representativeUserId: number, documentId: number) {
    const data = await this.cdduData(missionId, representativeUserId, documentId);

    return this.pdfService.generateCddu(data);
  }

  private async cdduData(
    missionId: number,
    representativeUserId: number,
    documentId: number,
  ): Promise<CdduContractData> {
    const [rows] = await this.sequelize.query(
      `SELECT
        m.final_price AS "finalPrice",
        p.title AS "jobTitle",
        p.description AS "missionDescription",
        p.hourly_rate AS "hourlyRate",
        to_char(p.starting_date, 'DD/MM/YYYY "à" HH24:MI') AS "startDate",
        to_char(p.ending_date, 'DD/MM/YYYY "à" HH24:MI') AS "endDate",
        extract(epoch FROM p.ending_date - p.starting_date) / 3600 AS "totalHours",
        ${FULL_ADDRESS('pa')} AS "missionLocation",
        c.name AS "companyName",
        c.siret_number AS "siret",
        ${FULL_ADDRESS('ca')} AS "companyAddress",
        wu.first_name AS "workerFirstName",
        wu.last_name AS "workerLastName",
        to_char(wu.birth_date, 'DD/MM/YYYY') AS "workerBirthDate",
        ${FULL_ADDRESS('wa')} AS "workerAddress",
        (SELECT concat_ws(' ', first_name, last_name) FROM "user" WHERE id = :representativeUserId) AS "representative",
        to_char(now() AT TIME ZONE 'Europe/Paris', 'DD/MM/YYYY') AS "createdDate"
      FROM "mission" m
      JOIN "company" c ON c.id = m.company_id
      JOIN "worker_profile" w ON w.id = m.worker_id
      JOIN "user" wu ON wu.id = w.user_id
      LEFT JOIN "publication" p ON p.id = m.publication_id
      LEFT JOIN "address" pa ON pa.id = p.address_id
      LEFT JOIN "address" ca ON ca.id = c.address_id
      LEFT JOIN "address" wa ON wa.id = w.address_id
      WHERE m.id = :missionId`,
      { replacements: { missionId, representativeUserId } },
    );
    const row = (rows as MissionContractRow[])[0];

    if (!row) {
      throw new NotFoundException(`Mission #${missionId} introuvable`);
    }
    if (!row.siret?.trim()) {
      throw new BadRequestException(
        "Complétez le SIRET de l'entreprise avant de générer le contrat",
      );
    }
    if (!row.startDate || !row.endDate || row.totalHours === null || row.hourlyRate === null) {
      throw new BadRequestException(
        'La publication de la mission doit avoir des dates et un taux horaire',
      );
    }

    const totalHours = round(Number(row.totalHours));
    const hourlyRate = Number(row.hourlyRate);

    return {
      contractRef: `CDDU-${row.createdDate.slice(-4)}-${documentId}`,
      createdDate: row.createdDate,
      employer: {
        name: row.companyName,
        siret: row.siret,
        address: row.companyAddress ?? '',
        representative: row.representative ?? '',
      },
      employee: {
        firstName: row.workerFirstName,
        lastName: row.workerLastName,
        nir: '',
        birthDate: row.workerBirthDate ?? '',
        address: row.workerAddress ?? '',
      },
      jobTitle: row.jobTitle ?? '',
      missionDescription: row.missionDescription ?? '',
      startDate: row.startDate,
      endDate: row.endDate,
      totalHours,
      hourlyRate,
      totalGrossSalary:
        row.finalPrice !== null ? Number(row.finalPrice) : round(totalHours * hourlyRate),
      missionLocation: row.missionLocation ?? '',
    };
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
