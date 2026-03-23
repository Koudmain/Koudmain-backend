import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Publication } from '../../publication/models/publication.model';

@Injectable()
export class PlanningService {
  constructor(
    @InjectModel(Publication)
    private readonly publicationModel: typeof Publication,
  ) {}

  async getPlanning(
    startDate?: string,
    endDate?: string,
  ) {
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
    } else {
      const now = new Date();
      filterStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      filterEndDate = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
    }

    const rows = await this.publicationModel.findAll({
      where: {
        starting_date: {
          [Op.lte]: filterEndDate,
        },
        ending_date: {
          [Op.gte]: filterStartDate,
        },
      },
      order: [['starting_date', 'ASC']],
    });

    return rows;
  }
}
