import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { WorkerJob } from '@/modules/workers/models/worker-job.model';
import { Transaction } from 'sequelize';

@Injectable()
export class WorkersService {
  constructor(
    @InjectModel(WorkerProfile)
    private workerProfileModel: typeof WorkerProfile,
    @InjectModel(WorkerJob)
    private workerJobModel: typeof WorkerJob,
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
}
