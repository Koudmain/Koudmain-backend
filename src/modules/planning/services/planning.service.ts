import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Publication } from '@/modules/publication/models/publication.model';
import { User } from '@/modules/users/models/user.model';
import { Application } from '@/modules/application/models/application.model';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { Company } from '@/modules/companies/models/company.model';
import { Review } from '@/modules/review/models/review.model';

@Injectable()
export class PlanningService {
  constructor(
    @InjectModel(Publication)
    private readonly publicationModel: typeof Publication,
    @InjectModel(User)
    private readonly userModel: typeof User,
    @InjectModel(Application)
    private readonly applicationModel: typeof Application,
  ) {}

  async getPlanning(userId: number, appContext?: string, startDate?: string, endDate?: string) {
    let filterStartDate: Date;
    let filterEndDate: Date;

    if (startDate && endDate) {
      filterStartDate = new Date(startDate);
      filterEndDate = new Date(endDate);

      if (isNaN(filterStartDate.getTime()) || isNaN(filterEndDate.getTime())) {
        throw new BadRequestException('startDate et endDate doivent être des dates valides');
      }

      if (filterStartDate > filterEndDate) {
        throw new BadRequestException('startDate doit être antérieure ou égale à endDate');
      }
    } else if (!startDate && !endDate) {
      const now = new Date();
      filterStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      filterEndDate = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
    } else {
      throw new BadRequestException(
        'Les paramètres startDate et endDate doivent être fournis ensemble',
      );
    }

    const user = await this.userModel.findByPk(userId);

    if (!user) {
      throw new BadRequestException('Utilisateur non trouvé');
    }

    if (appContext === 'worker') {
      return this.getWorkerPlanning(userId, filterStartDate, filterEndDate);
    } else if (appContext === 'employer') {
      return this.getEmployerPlanning(userId, filterStartDate, filterEndDate);
    } else {
      throw new BadRequestException(
        "L'utilisateur doit avoir un app_context valide dans le token (worker ou employer)",
      );
    }
  }

  private async getEmployerPlanning(userId: number, filterStartDate: Date, filterEndDate: Date) {
    const applications = await this.applicationModel.findAll({
      include: [
        {
          model: Publication,
          as: 'publication',
          required: true,
          where: {
            created_by_user_id: userId,
            starting_date: {
              [Op.lte]: filterEndDate,
            },
            ending_date: {
              [Op.gte]: filterStartDate,
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
      const totalRating = reviews.reduce((sum: number, r: Review) => sum + r.rating, 0);
      const workerRating = reviews.length > 0 ? totalRating / reviews.length : 0;

      return {
        publicationId: pub.id,
        title: pub.title,
        salary: pub.hourly_rate,
        startingDate: pub.starting_date,
        endingDate: pub.ending_date,
        workerName: worker ? `${worker.first_name} ${worker.last_name}` : null,
        workerProfilePicture: worker?.profile_picture_url || null,
        workerRating: Number(workerRating.toFixed(2)),
        workerRatingCount: reviews.length,
      };
    });
  }

  private async getWorkerPlanning(userId: number, filterStartDate: Date, filterEndDate: Date) {
    const applications = await this.applicationModel.findAll({
      include: [
        {
          model: WorkerProfile,
          as: 'workerProfile',
          where: { user_id: userId },
          required: true,
        },
        {
          model: Publication,
          as: 'publication',
          required: true,
          where: {
            starting_date: {
              [Op.lte]: filterEndDate,
            },
            ending_date: {
              [Op.gte]: filterStartDate,
            },
          },
          include: [
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
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      const companyRating = reviews.length > 0 ? totalRating / reviews.length : 0;

      return {
        publicationId: pub.id,
        title: pub.title,
        salary: pub.hourly_rate,
        startingDate: pub.starting_date,
        endingDate: pub.ending_date,
        companyName: pub.company?.name || null,
        companyRating: Number(companyRating.toFixed(2)),
        companyRatingCount: reviews.length,
        companyLogo: pub.creator?.profile_picture_url || null,
        applicationStatus: app.status,
      };
    });
  }
}
