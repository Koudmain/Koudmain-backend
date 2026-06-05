import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Publication } from '@/modules/publication/models/publication.model';
import { User } from '@/modules/users/models/user.model';
import { Application } from '@/modules/application/models/application.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { Company } from '@/modules/companies/models/company.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { Review } from '@/modules/review/models/review.model';
import { Address } from '@/modules/address/address.model';

@Injectable()
export class PlanningService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
    @InjectModel(Application)
    private readonly applicationModel: typeof Application,
    @InjectModel(CompanyMember)
    private readonly companyMemberModel: typeof CompanyMember,
  ) {}

  async getPlanning(
    user_id: number,
    app_context?: string,
    start_date?: string,
    end_date?: string,
    active_company_id?: number,
  ) {
    let filter_start_date: Date;
    let filter_end_date: Date;

    if (start_date && end_date) {
      filter_start_date = new Date(start_date);
      filter_end_date = new Date(end_date);

      if (isNaN(filter_start_date.getTime()) || isNaN(filter_end_date.getTime())) {
        throw new BadRequestException('startDate et endDate doivent être des dates valides');
      }

      if (filter_start_date > filter_end_date) {
        throw new BadRequestException('startDate doit être antérieure ou égale à endDate');
      }
    } else if (!start_date && !end_date) {
      const now = new Date();
      filter_start_date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      filter_end_date = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
    } else {
      throw new BadRequestException(
        'Les paramètres startDate et endDate doivent être fournis ensemble',
      );
    }

    const user = await this.userModel.findByPk(user_id);

    if (!user) {
      throw new BadRequestException('Utilisateur non trouvé');
    }

    if (app_context === 'worker') {
      return this.getWorkerPlanning(user_id, filter_start_date, filter_end_date);
    } else if (app_context === 'employer') {
      return this.getEmployerPlanning(
        user_id,
        filter_start_date,
        filter_end_date,
        active_company_id,
      );
    } else {
      throw new BadRequestException(
        "L'utilisateur doit avoir un app_context valide dans le token (worker ou employer)",
      );
    }
  }

  private async getEmployerPlanning(
    user_id: number,
    filter_start_date: Date,
    filter_end_date: Date,
    active_company_id?: number,
  ) {
    if (!active_company_id) {
      throw new BadRequestException(
        'activeCompanyId est obligatoire pour consulter le planning employer',
      );
    }

    const membership = await this.companyMemberModel.findOne({
      where: { user_id: user_id, company_id: active_company_id },
    });

    if (!membership) {
      throw new ForbiddenException('Utilisateur non autorisé pour cette company');
    }

    const applications = await this.applicationModel.findAll({
      include: [
        {
          model: Publication,
          as: 'publication',
          required: true,
          where: {
            company_id: active_company_id,
            starting_date: {
              [Op.lte]: filter_end_date,
            },
            ending_date: {
              [Op.gte]: filter_start_date,
            },
          },
          include: [
            {
              model: Company,
              as: 'company',
              required: false,
            },
          ],
        },
        {
          model: WorkerProfile,
          as: 'workerProfile',
          required: true,
          include: [
            {
              model: User,
              as: 'user',
              required: true,
              include: [
                {
                  model: Review,
                  as: 'reviews',
                  required: false,
                },
              ],
            },
          ],
        },
      ],
      where: {
        status: {
          [Op.in]: ['Accepted'],
        },
      },
      order: [['publication', 'starting_date', 'ASC']],
    });

    return applications.map((app) => {
      const pub = app.publication;
      const worker = app.workerProfile?.user;
      const reviews = worker?.reviews || [];
      const total_rating = reviews.reduce((sum: number, r: Review) => sum + r.rating, 0);
      const worker_rating = reviews.length > 0 ? total_rating / reviews.length : 0;

      return {
        publication_id: pub.id,
        title: pub.title,
        salary: pub.hourly_rate,
        starting_date: pub.starting_date,
        ending_date: pub.ending_date,
        worker_name: worker ? `${worker.first_name} ${worker.last_name}` : null,
        worker_profile_picture: worker?.profile_picture_url || null,
        worker_rating: Number(worker_rating.toFixed(2)),
        worker_rating_count: reviews.length,
      };
    });
  }

  private async getWorkerPlanning(user_id: number, filter_start_date: Date, filter_end_date: Date) {
    const applications = await this.applicationModel.findAll({
      include: [
        {
          model: WorkerProfile,
          as: 'workerProfile',
          where: { userId: user_id },
          required: true,
        },
        {
          model: Publication,
          as: 'publication',
          required: true,
          where: {
            starting_date: {
              [Op.lte]: filter_end_date,
            },
            ending_date: {
              [Op.gte]: filter_start_date,
            },
          },
          include: [
            {
              model: Address,
              as: 'address',
              required: false,
            },
            {
              model: Company,
              as: 'company',
              required: false,
            },
            {
              model: User,
              as: 'creator',
              required: false,
              include: [
                {
                  model: Review,
                  as: 'reviews',
                  required: false,
                },
              ],
            },
          ],
        },
      ],
      order: [['publication', 'starting_date', 'ASC']],
    });

    return applications.map((app) => {
      const pub = app.publication;
      const reviews = pub?.creator?.reviews || [];
      const total_rating = reviews.reduce((sum, r) => sum + r.rating, 0);
      const company_rating = reviews.length > 0 ? total_rating / reviews.length : 0;

      return {
        publication_id: pub.id,
        title: pub.title,
        salary: pub.hourly_rate,
        starting_date: pub.starting_date,
        ending_date: pub.ending_date,
        company_name: pub.company?.name || null,
        company_rating: Number(company_rating.toFixed(2)),
        company_rating_count: reviews.length,
        company_logo: pub.creator?.profile_picture_url || null,
        application_status: app.status,
        city: pub.address?.city || null,
        zip: pub.address?.zip_code || null,
      };
    });
  }
}
