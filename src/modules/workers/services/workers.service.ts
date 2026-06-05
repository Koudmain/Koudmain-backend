import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { WorkerProfile } from '../models/worker-profile.model';
import { CreationAttributes, Transaction } from 'sequelize';

@Injectable()
export class WorkersService {
  constructor(
    @InjectModel(WorkerProfile)
    private workerProfileModel: typeof WorkerProfile,
  ) {}

  async create(
    data: CreationAttributes<WorkerProfile>,
    options?: { transaction?: Transaction },
  ): Promise<WorkerProfile> {
    return this.workerProfileModel.create(data, { transaction: options?.transaction });
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
}
