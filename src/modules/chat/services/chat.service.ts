import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Message } from '@/modules/chat/models/message.model';
import { Conversation } from '@/modules/chat/models/conversation.model';
import { RedisPubService } from './redis-pub.service';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { Company } from '@/modules/companies/models/company.model';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message) private messageModel: typeof Message,
    @InjectModel(Conversation) private conversationModel: typeof Conversation,
    private redisPubService: RedisPubService,
    private readonly workersService: WorkersService,
  ) {}

  async sendMessage(
    userId: number,
    conversationId: number,
    content: string,
    type: string = 'TEXT',
  ) {
    const message = await this.messageModel.create({
      sender_id: userId,
      conversation_id: conversationId,
      content_text: content,
      message_type: type,
    });

    const conv = await this.conversationModel.findByPk(conversationId, {
      include: [
        { model: WorkerProfile, as: 'worker' },
        { model: Company, as: 'company', include: ['members'] },
      ],
    });

    if (!conv) throw new NotFoundException('Conversation introuvable');

    const targetUserIds = new Set<number>();

    if (userId === conv.worker.user_id) {
      conv.company.members.forEach((member) => {
        targetUserIds.add(member.user_id);
      });
    } else {
      targetUserIds.add(conv.worker.user_id);
    }

    const messageData = message.toJSON();

    for (const receiverId of targetUserIds) {
      await this.redisPubService.publishMessage({
        ...messageData,
        type: 'MESSAGE',
        receiver_id: receiverId,
      });
    }

    return message;
  }

  async getConversationsForWorker(userId: number) {
    const workerId = await this.workersService.getWorkerIdByUserId(userId);
    return this.conversationModel.findAll({
      where: { worker_id: workerId },
      include: ['company', 'publication'],
      order: [['updated_at', 'DESC']],
    });
  }

  async getConversationsForCompany(companyId: number) {
    return this.conversationModel.findAll({
      where: { company_id: companyId },
      include: ['worker', 'publication'],
      order: [['updated_at', 'DESC']],
    });
  }

  async getMessagesByConversation(conversationId: number, limit: number, offset: number) {
    return this.messageModel.findAll({
      where: { conversation_id: conversationId },
      order: [['created_at', 'ASC']],
      limit: limit,
      offset: offset,
    });
  }

  async getConversationMessages(conversationId: number) {
    return this.messageModel.findAll({
      where: { conversation_id: conversationId },
      order: [['created_at', 'ASC']],
    });
  }

  async findOrCreateConversation(publicationId: number, workerId: number, companyId: number) {
    const [conversation, created] = await this.conversationModel.findOrCreate({
      where: {
        publication_id: publicationId,
        worker_id: workerId,
        company_id: companyId,
      },
      defaults: {
        status: 'active',
        updated_at: new Date(),
      },
    });
    return conversation;
  }
}
