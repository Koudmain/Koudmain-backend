import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { WorkerProfile } from '../models/worker-profile.model';
import { CreationAttributes } from 'sequelize';

@Injectable()
export class WorkersService {
  constructor(
    @InjectModel(WorkerProfile)
    private workerProfileModel: typeof WorkerProfile,
  ) {}

  async create(data: CreationAttributes<WorkerProfile>): Promise<WorkerProfile> {
    return this.workerProfileModel.create(data);
  }
}
