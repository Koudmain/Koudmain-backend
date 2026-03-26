import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Sequelize } from 'sequelize';
import { Publication } from '../../publication/models/publication.model';
import { User } from '../../users/models/user.model';

@Injectable()
export class PlanningService {
  constructor(
    @InjectModel(Publication)
    private readonly publicationModel: typeof Publication,
    @InjectModel(User)
    private readonly userModel: typeof User,
  ) {}

  async getPlanning(userId: number, startDate?: string, endDate?: string) {
    let filterStartDate: Date;
    let filterEndDate: Date;

    if (startDate || endDate) {
      if (!startDate || !endDate) {
        throw new BadRequestException('Both startDate and endDate must be provided together');
      }

      filterStartDate = new Date(startDate);
      filterEndDate = new Date(endDate);

      if (isNaN(filterStartDate.getTime()) || isNaN(filterEndDate.getTime())) {
        throw new BadRequestException('startDate and endDate must be valid dates');
      }

      if (filterStartDate > filterEndDate) {
        throw new BadRequestException('startDate must be before or equal to endDate');
      }
    } else {
      const now = new Date();
      filterStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      filterEndDate = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
    }

    const user = await this.userModel.findByPk(userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.is_worker_active) {
      return this.getWorkerPlanning(userId, filterStartDate, filterEndDate);
      // } else if (user.is_employer_active) {
      //   return this.getEmployerPlanning(userId, filterStartDate, filterEndDate);
    } else {
      throw new BadRequestException('User must be either an active worker or employer');
    }
  }

  private async getWorkerPlanning(userId: number, filterStartDate: Date, filterEndDate: Date) {
    const rows = await this.publicationModel.findAll({
      attributes: [
        ['id', 'publicationId'],
        ['title', 'title'],
        ['hourly_rate', 'salary'],
        ['starting_date', 'startingDate'],
        ['ending_date', 'endingDate'],
        [
          Sequelize.literal(
            `(SELECT name FROM company WHERE company.id = "Publication".company_id LIMIT 1)`,
          ),
          'companyName',
        ],
        [
          Sequelize.literal(
            `(SELECT COALESCE(AVG(rating), 0) FROM review WHERE review.rated_id = "Publication".created_by_user_id)`,
          ),
          'companyRating',
        ],
        [
          Sequelize.literal(
            `(SELECT COUNT(id) FROM review WHERE review.rated_id = "Publication".created_by_user_id)`,
          ),
          'companyRatingCount',
        ],
        [
          Sequelize.literal(
            `(SELECT profile_picture_url FROM "user" WHERE "user".id = "Publication".created_by_user_id LIMIT 1)`,
          ),
          'companyLogo',
        ],
        [
          Sequelize.literal(
            `(SELECT status FROM application JOIN worker_profile wp ON wp.id = application.worker_id WHERE application.publication_id = "Publication".id AND wp.user_id = ${userId} LIMIT 1)`,
          ),
          'applicationStatus',
        ],
      ],
      where: {
        starting_date: {
          [Op.lte]: filterEndDate,
        },
        ending_date: {
          [Op.gte]: filterStartDate,
        },
        id: {
          [Op.in]: Sequelize.literal(
            `(SELECT application.publication_id FROM application JOIN worker_profile wp ON wp.id = application.worker_id WHERE wp.user_id = ${userId})`,
          ),
        },
      },
      order: [['starting_date', 'ASC']],
    });

    return rows;
  }
}
