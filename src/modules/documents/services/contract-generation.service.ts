import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PdfService } from '@/modules/pdf/services/pdf.service';
import { CdduContractData } from '@/modules/pdf/dtos/cddu-data.dto';
import { Mission } from '@/modules/missions/mission.model';
import { Company } from '@/modules/companies/models/company.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { User } from '@/modules/users/models/user.model';
import { Address } from '@/modules/address/address.model';

const addressInclude = () => ({
  model: Address,
  as: 'address',
  attributes: ['id', 'full_address', 'street_number', 'street_name', 'zip_code', 'city'],
});

@Injectable()
export class ContractGenerationService {
  constructor(
    private readonly pdfService: PdfService,
    @InjectModel(Mission) private missionModel: typeof Mission,
    @InjectModel(User) private userModel: typeof User,
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
    const [mission, representative] = await Promise.all([
      this.missionModel.findByPk(missionId, {
        attributes: ['id', 'finalPrice'],
        include: [
          {
            model: Company,
            as: 'company',
            required: true,
            attributes: ['id', 'name', ['siret_number', 'siret']],
            include: [addressInclude()],
          },
          {
            model: WorkerProfile,
            as: 'worker',
            required: true,
            attributes: ['id'],
            include: [
              {
                model: User,
                as: 'user',
                required: true,
                attributes: ['id', 'first_name', 'last_name', 'birth_date'],
              },
              addressInclude(),
            ],
          },
          {
            model: Publication,
            as: 'publication',
            attributes: [
              'id',
              'title',
              'description',
              'hourly_rate',
              'starting_date',
              'ending_date',
            ],
            include: [addressInclude()],
          },
        ],
      }),
      this.userModel.findByPk(representativeUserId, { attributes: ['first_name', 'last_name'] }),
    ]);

    if (!mission) {
      throw new NotFoundException(`Mission #${missionId} introuvable`);
    }

    const { company, publication } = mission;
    const worker = mission.worker.user;
    const siret = company.get('siret') as string | null;

    if (!siret?.trim()) {
      throw new BadRequestException(
        "Complétez le SIRET de l'entreprise avant de générer le contrat",
      );
    }
    if (
      !publication?.starting_date ||
      !publication.ending_date ||
      publication.hourly_rate === null
    ) {
      throw new BadRequestException(
        'La publication de la mission doit avoir des dates et un taux horaire',
      );
    }

    const createdDate = parisDate(new Date());
    const totalHours = round(
      (publication.ending_date.getTime() - publication.starting_date.getTime()) / 3_600_000,
    );
    const hourlyRate = Number(publication.hourly_rate);

    return {
      contractRef: `CDDU-${createdDate.slice(-4)}-${documentId}`,
      createdDate,
      employer: {
        name: company.name,
        siret,
        address: fullAddress(company.address),
        representative: representative
          ? [representative.first_name, representative.last_name].filter(Boolean).join(' ')
          : '',
      },
      employee: {
        firstName: worker.first_name,
        lastName: worker.last_name,
        nir: '',
        birthDate: worker.birth_date ? worker.birth_date.split('-').reverse().join('/') : '',
        address: fullAddress(mission.worker.address),
      },
      jobTitle: publication.title ?? '',
      missionDescription: publication.description ?? '',
      startDate: storedDateTime(publication.starting_date),
      endDate: storedDateTime(publication.ending_date),
      totalHours,
      hourlyRate,
      totalGrossSalary:
        mission.finalPrice !== null ? Number(mission.finalPrice) : round(totalHours * hourlyRate),
      missionLocation: fullAddress(publication.address),
    };
  }
}

function fullAddress(address: Address | null | undefined): string {
  if (!address) return '';
  if (address.full_address) return address.full_address;

  const street = [address.street_number, address.street_name].filter(Boolean).join(' ');
  const city = [address.zip_code, address.city].filter(Boolean).join(' ');

  return [street, city].filter(Boolean).join(', ');
}

function storedDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');

  return (
    `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}` +
    ` à ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
  );
}

function parisDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
