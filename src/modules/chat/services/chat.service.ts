import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Message } from '@/modules/chat/models/message.model';
import { Conversation } from '@/modules/chat/models/conversation.model';
import { RedisPubService } from './redis-pub.service';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { Company } from '@/modules/companies/models/company.model';
import { User } from '@/modules/users/models/user.model';
import { ConversationSetting } from '../models/conversation-setting.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message) private messageModel: typeof Message,
    @InjectModel(Conversation) private conversationModel: typeof Conversation,
    @InjectModel(ConversationSetting) private conversationSettingModel: typeof ConversationSetting,
    @InjectModel(WorkerProfile) private workerModel: typeof WorkerProfile,
    @InjectModel(CompanyMember) private companyMemberModel: typeof CompanyMember,
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

  async getConversationsForCompany(companyId: number, userId: number) {
    return this.conversationModel.findAll({
      where: { company_id: companyId },
      include: [
        {
          model: WorkerProfile,
          as: 'worker',
          include: [{ model: User, as: 'user', attributes: { exclude: ['password'] } }],
        },
        {
          model: ConversationSetting,
          as: 'settings',
          where: { user_id: userId },
          required: false,
        },
        'publication',
        {
          model: Message,
          as: 'last_message',
          limit: 1,
          order: [['created_at', 'DESC']],
        },
      ],
      order: [['updated_at', 'DESC']],
    });
  }

  async getConversationDetailsForCompany(userId: number, conversationId: number) {
    return this.conversationModel.findOne({
      where: { id: conversationId },
      include: [
        {
          model: WorkerProfile,
          as: 'worker',
          include: [{ model: User, as: 'user', attributes: { exclude: ['password'] } }],
        },
        {
          model: ConversationSetting,
          as: 'settings',
          where: { user_id: userId },
          required: false,
        },
        'publication'
      ],
    });
  }

  async getMessagesByConversation(conversationId: number, limit: number, offset: number) {
    return this.messageModel.findAll({
      where: { conversation_id: conversationId },
      order: [['created_at', 'DESC']],
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

    if (created) {
    console.log('Conversation créée avec ID:', conversation.id);
    const workerProfile = await this.workerModel.findByPk(workerId);

    const members = await this.companyMemberModel.findAll({
      where: { company_id: companyId }
    });

    const settingsToCreate = [];

    if (workerProfile) {
      settingsToCreate.push({
        user_id: workerProfile.user_id,
        conversation_id: conversation.id
      });
    }

    members.forEach(member => {
      settingsToCreate.push({
        user_id: member.user_id,
        conversation_id: conversation.id
      });
    });

    await this.conversationSettingModel.bulkCreate(settingsToCreate);
  }
    return conversation;
  }
}
