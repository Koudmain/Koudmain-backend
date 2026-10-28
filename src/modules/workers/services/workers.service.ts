import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { WorkerJob } from '@/modules/workers/models/worker-job.model';
import { Transaction } from 'sequelize';
import { User } from '@/modules/users/models/user.model';
import { Address } from '@/modules/address/address.model';
import { SkillCategory } from '@/modules/skill-category/models/skill-category.model';
import { WorkerExperience } from '@/modules/workers/models/worker-experience.model';
import { WorkerFormation } from '@/modules/workers/models/worker-formation.model';
import {
  WorkerVerification,
  WorkerVerificationStatus,
  WorkerVerificationType,
} from '@/modules/workers/models/worker-verification.model';
import { Review, ReviewType } from '@/modules/review/models/review.model';
import { Company } from '@/modules/companies/models/company.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { Application } from '@/modules/application/models/application.model';
import { Publication } from '@/modules/publication/models/publication.model';
import { Document } from '@/modules/document/models/document.model';
import { buildRatingSummary } from '@/modules/review/review.utils';
import { Sequelize } from 'sequelize-typescript';
import { AddressService } from '@/modules/address/services/address.service';
import { UpdateWorkerProfileDto } from '@/modules/workers/dto/update-worker-profile.dto';

@Injectable()
export class WorkersService {
  constructor(
    @InjectModel(WorkerProfile)
    private workerProfileModel: typeof WorkerProfile,
    @InjectModel(WorkerJob)
    private workerJobModel: typeof WorkerJob,
    @InjectModel(Review)
    private reviewModel: typeof Review,
    @InjectModel(Application)
    private applicationModel: typeof Application,
    @InjectModel(WorkerExperience)
    private experienceModel: typeof WorkerExperience,
    @InjectModel(WorkerFormation)
    private formationModel: typeof WorkerFormation,
    private addressService: AddressService,
    private sequelize: Sequelize,
  ) {}

  async create(
    data: {
      userId: number;
      bio?: string;
      workRadius?: number;
      addressId?: number;
      skillCategoryIds: number[];
    },
    options?: { transaction?: Transaction },
  ): Promise<WorkerProfile> {
    const worker = await this.workerProfileModel.create(
      {
        userId: data.userId,
        bio: data.bio,
        workRadius: data.workRadius,
        addressId: data.addressId,
      },
      { transaction: options?.transaction },
    );

    if (data.skillCategoryIds && data.skillCategoryIds.length > 0) {
      const tradeRows = data.skillCategoryIds.map((skillCategoryId) => ({
        workerId: worker.id,
        skillCategoryId,
      }));
      await this.workerJobModel.bulkCreate(tradeRows, { transaction: options?.transaction });
    }

    return worker;
  }

  async getWorkerIdByUserId(userId: number): Promise<number> {
    const worker = await this.workerProfileModel.findOne({
      where: { userId },
      attributes: ['id'],
    });
    if (!worker) throw new NotFoundException('Profil Worker introuvable');
    return worker.id;
  }

  async getWorkerByUserId(userId: number): Promise<WorkerProfile> {
    const worker = await this.workerProfileModel.findOne({
      where: { userId },
    });
    if (!worker) throw new NotFoundException('Profil Worker introuvable');
    return worker;
  }

  async getOwnProfile(userId: number) {
    const worker = await this.getWorkerByUserId(userId);

    return { ...(await this.getPublicProfile(worker.id, userId)), workRadius: worker.workRadius };
  }

  async updateOwnProfile(userId: number, dto: UpdateWorkerProfileDto) {
    const worker = await this.getWorkerByUserId(userId);
    let addressId = worker.addressId;

    // Geocoding (HTTP call) outside the transaction
    if (dto.address) {
      if (addressId) {
        await this.addressService.updateAddress(addressId, dto.address);
      } else {
        addressId = (await this.addressService.createAddress(dto.address)).id;
      }
    }

    await this.sequelize.transaction(async (transaction) => {
      await worker.update({ bio: dto.bio, workRadius: dto.workRadius, addressId }, { transaction });

      if (dto.skillCategoryIds) {
        await this.workerJobModel.destroy({ where: { workerId: worker.id }, transaction });
        await this.workerJobModel.bulkCreate(
          [...new Set(dto.skillCategoryIds)].map((skillCategoryId) => ({
            workerId: worker.id,
            skillCategoryId,
          })),
          { transaction },
        );
      }

      if (dto.experiences) {
        await this.experienceModel.destroy({ where: { workerId: worker.id }, transaction });
        await this.experienceModel.bulkCreate(
          dto.experiences.map((experience) => ({ ...experience, workerId: worker.id })),
          { transaction },
        );
      }

      if (dto.formations) {
        await this.formationModel.destroy({ where: { workerId: worker.id }, transaction });
        await this.formationModel.bulkCreate(
          dto.formations.map((formation) => ({ ...formation, workerId: worker.id })),
          { transaction },
        );
      }
    });

    return this.getOwnProfile(userId);
  }

  async getPublicProfile(workerId: number, viewerUserId: number) {
    const worker = await this.workerProfileModel.findByPk(workerId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'first_name', 'last_name', 'profile_picture_url', 'createdAt'],
        },
        { model: Address, as: 'address', attributes: ['city', 'zip_code'] },
        {
          model: SkillCategory,
          as: 'skillCategories',
          attributes: ['id', 'name'],
          through: { attributes: [] },
        },
        {
          model: WorkerExperience,
          as: 'experiences',
          attributes: ['id', 'title', 'durationMonths'],
        },
        {
          model: WorkerFormation,
          as: 'formations',
          attributes: ['id', 'title', 'institution', 'type', 'obtainedDate'],
        },
        { model: WorkerVerification, as: 'verifications', attributes: ['type', 'status'] },
      ],
      order: [
        [{ model: WorkerExperience, as: 'experiences' }, 'createdAt', 'DESC'],
        // A list saved in one batch shares the same created_at: keep the input order
        [{ model: WorkerExperience, as: 'experiences' }, 'id', 'ASC'],
        [{ model: WorkerFormation, as: 'formations' }, 'obtainedDate', 'DESC'],
      ],
    });

    if (!worker) throw new NotFoundException('Profil Worker introuvable');

    const isOwnProfile = worker.userId === viewerUserId;
    const [reviews, application] = await Promise.all([
      this.reviewModel.findAll({
        where: { rated_id: worker.userId, type: ReviewType.COMPANY_TO_WORKER },
        include: [{ model: Company, as: 'reviewerCompany', attributes: ['id', 'name', 'logoUrl'] }],
        order: [['createdAt', 'DESC']],
      }),
      // CV and cover letter are only visible if the worker applied to this employer
      this.applicationModel.findOne({
        where: { workerId },
        include: [
          {
            model: Publication,
            as: 'publication',
            required: true,
            attributes: [],
            include: [
              {
                model: Company,
                as: 'company',
                required: true,
                attributes: [],
                include: [
                  {
                    model: CompanyMember,
                    as: 'members',
                    where: { userId: viewerUserId },
                    required: true,
                    attributes: [],
                  },
                ],
              },
            ],
          },
          { model: Document, as: 'cvDocument' },
          { model: Document, as: 'coverLetterDocument' },
        ],
        order: [['createdAt', 'DESC']],
        subQuery: false,
      }),
    ]);

    return {
      id: worker.id,
      user: worker.user,
      bio: worker.bio,
      address: worker.address,
      skills: worker.skillCategories.map(({ id, name }) => ({ id, name })),
      reliability: {
        missionsCompleted: worker.missionsCompleted,
        responseRate: worker.responseRate === null ? null : Number(worker.responseRate),
        avgResponseTimeMin: worker.avgResponseTimeMin,
      },
      verifications: Object.values(WorkerVerificationType).map((type) => ({
        type,
        status:
          worker.verifications.find((verification) => verification.type === type)?.status ??
          WorkerVerificationStatus.PENDING,
      })),
      experiences: worker.experiences,
      formations: worker.formations,
      hasApplied: application !== null,
      documents: {
        cv: this.formatDocument(application?.cvDocument),
        coverLetter: this.formatDocument(application?.coverLetterDocument),
      },
      rating: buildRatingSummary(reviews),
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        author: {
          name: review.reviewerCompany?.name ?? 'Établissement Koudmain',
          pictureUrl: review.reviewerCompany?.logoUrl ?? null,
          // Only the reviewed worker can open the profiles of the companies that reviewed them
          profileId: isOwnProfile ? review.reviewerCompanyId : null,
        },
      })),
    };
  }

  private formatDocument(document?: Document | null) {
    if (!document) return null;

    return {
      url: document.filePath,
      name: document.filePath.split('/').pop() ?? document.filePath,
      sizeBytes: document.sizeBytes,
    };
  }
}
