import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { WorkerProfile } from '../models/worker-profile.model';

@Injectable()
export class WorkersService {
  constructor(
    @InjectModel(WorkerProfile)
    private workerProfileModel: typeof WorkerProfile,
  ) {}

  async create(data: Partial<WorkerProfile>): Promise<WorkerProfile> {
    return this.workerProfileModel.create(data as any);
  }
}
