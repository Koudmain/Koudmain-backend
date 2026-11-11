import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Company } from '@/modules/companies/models/company.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { CompanyJob } from '@/modules/companies/models/company-job.model';
import { CreationAttributes, Op, Transaction } from 'sequelize';
import { UpdateCompanyAddressDto } from '@/modules/address/address.dto';
import { GeocodingService } from '@/common/utils/geocoding/geocoding.service';
import { Address } from '@/modules/address/address.model';
import { CompanyType, OwnerPosition } from '@/modules/auth/models/register.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { Skill } from '@/modules/skill/models/skill.model';
import { Application } from '@/modules/application/models/application.model';
import { Mission } from '@/modules/mission/models/mission.model';
import { Review } from '@/modules/review/models/review.model';
import { User } from '@/modules/users/models/user.model';
import { buildRatingSummary } from '@/modules/review/review.utils';
import { DriveService } from '@/modules/drive/drive.service';
import { UpdateCompanyDto } from '@/modules/companies/dto/update-company.dto';

export const OPEN_PUBLICATION_STATUSES = ['Ouverte', 'Urgente'];

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company) private companyModel: typeof Company,
    @InjectModel(CompanyMember) private memberModel: typeof CompanyMember,
    @InjectModel(CompanyJob) private companyJobModel: typeof CompanyJob,
    @InjectModel(Address) private addressModel: typeof Address,
    @InjectModel(Publication) private publicationModel: typeof Publication,
    @InjectModel(Application) private applicationModel: typeof Application,
    @InjectModel(Mission) private missionModel: typeof Mission,
    @InjectModel(Review) private reviewModel: typeof Review,
    private geocodingService: GeocodingService,
    private driveService: DriveService,
  ) {}

  async createCompanyWithOwner(
    data: {
      name: string;
      companyType: CompanyType;
      ownerPosition: OwnerPosition;
      desiredJobIds: number[];
      addressId?: number;
    },
    userId: number,
    transaction?: Transaction,
  ): Promise<Company> {
    const companyData: CreationAttributes<Company> = {
      name: data.name,
      companyType: data.companyType,
      ownerPosition: data.ownerPosition,
      ...(data.addressId !== undefined && { addressId: data.addressId }),
    };
    const company = await this.companyModel.create(companyData, { transaction });

    const memberData: CreationAttributes<CompanyMember> = {
      companyId: company.id,
      userId: userId,
      role: OwnerPosition.OWNER,
    };
    await this.memberModel.create(memberData, { transaction });

    if (data.desiredJobIds.length > 0) {
      const tradeRows = data.desiredJobIds.map((skillCategoryId) => ({
        companyId: company.id,
        skillCategoryId,
      }));
      await this.companyJobModel.bulkCreate(tradeRows, { transaction });
    }

    return company;
  }

  async getUserCompanies(userId: number) {
    const memberships = await this.memberModel.findAll({
      where: { userId: userId },
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name'],
          include: ['address'],
        },
      ],
    });

    return memberships.map((m) => {
      const companyData = m.company;

      return {
        id: companyData?.id,
        name: companyData?.name,
        role: m.role,
        address: companyData?.address,
      };
    });
  }

  async updateCompanyAddress(
    userId: number,
    companyId: number,
    updateAddressDto: UpdateCompanyAddressDto,
  ) {
    await this.assertCompanyOwner(userId, companyId);

    const company = await this.companyModel.findByPk(companyId, {
      include: ['address'],
    });

    if (!company) {
      throw new NotFoundException('Entreprise introuvable');
    }

    const country = updateAddressDto.country || 'France';
    const fullAddressString =
      `${updateAddressDto.streetNumber || ''} ${updateAddressDto.streetName}, ${updateAddressDto.zipCode} ${updateAddressDto.city}, ${country}`.trim();

    let coords;
    try {
      coords = await this.geocodingService.getCoordsFromAddress(fullAddressString);
    } catch (error) {
      throw new InternalServerErrorException("Erreur lors du géocodage de l'adresse", {
        cause: error,
      });
    }

    const addressPayload = {
      street_number: updateAddressDto.streetNumber,
      street_name: updateAddressDto.streetName,
      zip_code: updateAddressDto.zipCode,
      city: updateAddressDto.city,
      country,
      full_address: fullAddressString,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    };

    if (company.address) {
      await company.address.update(addressPayload);
    } else {
      const newAddress = await this.addressModel.create(addressPayload);
      company.set('addressId', newAddress.id);
      await company.save();
    }

    return this.companyModel.findByPk(companyId, {
      include: ['address'],
    });
  }

  async updateCompany(
    userId: number,
    companyId: number,
    dto: UpdateCompanyDto,
    files: { logo?: Express.Multer.File[]; cover?: Express.Multer.File[] } = {},
  ) {
    await this.assertCompanyOwner(userId, companyId);

    const company = await this.companyModel.findByPk(companyId);
    if (!company) {
      throw new NotFoundException('Entreprise introuvable');
    }

    const updates: Partial<Company> = { ...dto };
    const logo = files.logo?.[0];
    const cover = files.cover?.[0];
    const oldLogoUrl = company.logoUrl;
    const oldCoverUrl = company.coverImageUrl;

    if (logo) {
      updates.logoUrl = await this.driveService.uploadImage(logo);
    }
    if (cover) {
      updates.coverImageUrl = await this.driveService.uploadImage(cover, {
        width: 1200,
        height: 600,
      });
    }

    await company.update(updates);

    if (logo && oldLogoUrl) await this.driveService.deleteFile(oldLogoUrl);
    if (cover && oldCoverUrl) await this.driveService.deleteFile(oldCoverUrl);

    return this.getPublicProfile(companyId, userId);
  }

  private async assertCompanyOwner(userId: number, companyId: number) {
    const membership = await this.memberModel.findOne({
      where: { userId: userId, companyId: companyId },
    });

    if (!membership || membership.role !== (OwnerPosition.OWNER as string)) {
      throw new ForbiddenException("Vous n'avez pas les droits pour modifier cette entreprise");
    }
  }

  async getPublicProfile(companyId: number, viewerUserId: number) {
    const company = await this.companyModel.findByPk(companyId, {
      include: [
        {
          model: Address,
          as: 'address',
          attributes: ['street_number', 'street_name', 'zip_code', 'city', 'full_address'],
        },
      ],
    });

    if (!company) {
      throw new NotFoundException('Établissement introuvable');
    }

    const [openPublications, reliability, reviews] = await Promise.all([
      this.publicationModel.findAll({
        where: { companyId, status: { [Op.in]: OPEN_PUBLICATION_STATUSES } },
        attributes: ['id', 'title', 'hourly_rate', 'starting_date', 'ending_date', 'status'],
        include: [{ model: Skill, attributes: ['id', 'name'], through: { attributes: [] } }],
        order: [['starting_date', 'ASC']],
      }),
      this.getCompanyReliability(companyId),
      this.getCompanyReviews(companyId, viewerUserId),
    ]);

    return {
      id: company.id,
      name: company.name,
      companyType: company.companyType,
      description: company.description,
      logoUrl: company.logoUrl,
      coverImageUrl: company.coverImageUrl,
      specialties: company.specialties,
      capacity: company.capacity,
      teamSize: company.teamSize,
      mealProvided: company.mealProvided,
      dressCode: company.dressCode,
      siretVerified: company.siretVerified,
      koudmainValidated: company.koudmainValidated,
      address: company.address,
      reliability,
      rating: buildRatingSummary(reviews),
      openPublications,
      reviews,
    };
  }

  private async getCompanyReliability(companyId: number) {
    const [missionsPublished, missions, applications] = await Promise.all([
      this.publicationModel.count({ where: { companyId } }),
      this.missionModel.findAll({
        where: {
          companyId,
          paidAt: { [Op.ne]: null },
          paymentDueDate: { [Op.ne]: null },
        },
        attributes: ['paidAt', 'paymentDueDate'],
      }),
      this.applicationModel.findAll({
        where: { respondedAt: { [Op.ne]: null } },
        attributes: ['createdAt', 'respondedAt'],
        include: [
          {
            model: Publication,
            as: 'publication',
            where: { companyId },
            required: true,
            attributes: [],
          },
        ],
      }),
    ]);

    const paidOnTimeCount = missions.filter(
      (mission) => mission.paidAt! <= mission.paymentDueDate!,
    ).length;
    const totalResponseTimeMin = applications.reduce(
      (sum, application) =>
        sum + (application.respondedAt!.getTime() - application.createdAt.getTime()) / 60000,
      0,
    );

    return {
      missionsPublished,
      paidOnTimeRate:
        missions.length > 0 ? Math.round((paidOnTimeCount / missions.length) * 100) : null,
      avgResponseTimeMin:
        applications.length > 0 ? Math.round(totalResponseTimeMin / applications.length) : null,
    };
  }

  private async getCompanyReviews(companyId: number, viewerUserId: number) {
    const [reviews, membership] = await Promise.all([
      this.reviewModel.findAll({
        where: { ratedCompanyId: companyId },
        include: [
          {
            model: User,
            as: 'reviewer',
            attributes: ['id', 'first_name', 'last_name', 'profile_picture_url'],
          },
          { model: Mission, as: 'mission', attributes: ['workerId'] },
        ],
        order: [['createdAt', 'DESC']],
      }),
      this.memberModel.findOne({
        where: { userId: viewerUserId, companyId },
        attributes: ['id'],
      }),
    ]);

    return reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      author: {
        name: review.reviewer
          ? `${review.reviewer.first_name} ${review.reviewer.last_name}`
          : 'Travailleur Koudmain',
        pictureUrl: review.reviewer?.profile_picture_url ?? null,
        // Only members of the reviewed company can open these workers' profiles
        profileId: membership ? (review.mission?.workerId ?? null) : null,
      },
    }));
  }
}
