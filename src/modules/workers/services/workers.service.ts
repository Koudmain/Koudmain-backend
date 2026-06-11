import { Injectable, NotFoundException } from '@nestjs/common';
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

  async getWorkerIdByUserId(userId: number): Promise<number> {
    const worker = await this.workerProfileModel.findOne({
      where: { userId: userId },
      attributes: ['id'],
    });
    if (!worker) throw new NotFoundException('Profil Worker introuvable');
    return worker.id;
  }

  async getWorkerByUserId(userId: number): Promise<WorkerProfile> {
    const worker = await this.workerProfileModel.findOne({
      where: { userId: userId },
    });
    if (!worker) throw new NotFoundException('Profil Worker introuvable');
    return worker;
  }
}
