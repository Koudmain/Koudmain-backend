import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Message, MessageAttributes } from '@/modules/chat/models/message.model';
import { Conversation } from '@/modules/chat/models/conversation.model';
import { RedisPubService } from './redis-pub.service';
import { WorkersService } from '@/modules/workers/services/workers.service';
import { WorkerProfile } from '@/modules/workers/models/worker-profile.model';
import { Company } from '@/modules/companies/models/company.model';
import { User } from '@/modules/users/models/user.model';
import { ConversationSetting } from '@/modules/chat/models/conversation-setting.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { Publication } from '@/modules/publication/models/publication.model';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message) private messageModel: typeof Message,
    @InjectModel(Conversation) private conversationModel: typeof Conversation,
    @InjectModel(ConversationSetting) private conversationSettingModel: typeof ConversationSetting,
    @InjectModel(WorkerProfile) private workerModel: typeof WorkerProfile,
    @InjectModel(CompanyMember) private companyMemberModel: typeof CompanyMember,
    @InjectModel(Company) private companyModel: typeof Company,
    @InjectModel(Publication) private publicationModel: typeof Publication,
    private redisPubService: RedisPubService,
    private readonly workersService: WorkersService,
  ) {}

  async sendMessage(
    userId: number,
    conversation_id: number,
    content: string,
    type: string = 'TEXT',
  ) {
    if (!content || content.trim() === '') {
      throw new BadRequestException('Le contenu du message ne peut pas être vide.');
    }
    const message = await this.messageModel.create({
      sender_id: userId,
      conversation_id: conversation_id,
      content_text: content,
      message_type: type,
    });

    const conv = await this.conversationModel.findByPk(conversation_id, {
      include: [
        { model: WorkerProfile, as: 'worker' },
        { model: Company, as: 'company', include: ['members'] },
      ],
    });

    if (!conv) throw new NotFoundException('Conversation introuvable');

    const targetUserIds = new Set<number>();

    if (userId === conv.worker.userId) {
      conv.company.members.forEach((member) => {
        targetUserIds.add(member.user_id);
      });
    } else {
      targetUserIds.add(conv.worker.userId);
    }

    const messageData = message.toJSON<MessageAttributes>();

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
    const worker_id = await this.workersService.getWorkerIdByUserId(userId);
    return this.conversationModel.findAll({
      where: { worker_id: worker_id },
      include: ['company', 'publication'],
      order: [['updated_at', 'DESC']],
    });
  }

  async getConversationsForCompany(company_id: number, userId: number) {
    const company = await this.companyModel.findByPk(company_id);

    if (!company) throw new NotFoundException(`L'entreprise ${company_id} n'existe pas.`);
    return this.conversationModel.findAll({
      where: { company_id: company_id },
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

  async getConversationDetailsForCompany(userId: number, conversation_id: number) {
    return this.conversationModel.findOne({
      where: { id: conversation_id },
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
      ],
    });
  }

  async getMessagesByConversation(conversation_id: number, limit: number, offset: number) {
    return this.messageModel.findAll({
      where: { conversation_id: conversation_id },
      order: [['created_at', 'DESC']],
      limit: limit,
      offset: offset,
    });
  }

  async getConversationMessages(conversation_id: number) {
    return this.messageModel.findAll({
      where: { conversation_id: conversation_id },
      order: [['created_at', 'ASC']],
    });
  }

  async findOrCreateConversation(publication_id: number, worker_id: number, company_id: number) {
    const [publication, workerProfile, company] = await Promise.all([
      this.publicationModel.findByPk(publication_id),
      this.workerModel.findByPk(worker_id),
      this.companyModel.findByPk(company_id),
    ]);

    if (!publication) throw new NotFoundException(`La publication ${publication_id} n'existe pas.`);
    if (!workerProfile)
      throw new NotFoundException(`Le profil travailleur ${worker_id} n'existe pas.`);
    if (!company) throw new NotFoundException(`L'entreprise ${company_id} n'existe pas.`);
    const [conversation, created] = await this.conversationModel.findOrCreate({
      where: {
        publication_id: publication_id,
        worker_id: worker_id,
        company_id: company_id,
      },
      defaults: {
        status: 'active',
        updated_at: new Date(),
      },
    });

    if (created) {
      const workerProfile = await this.workerModel.findByPk(worker_id);

      const members = await this.companyMemberModel.findAll({
        where: { company_id: company_id },
      });
      if (members.length === 0) {
        throw new BadRequestException(
          'Impossible de créer une conversation pour une entreprise sans membres.',
        );
      }

      const settingsToCreate = [];

      if (workerProfile) {
        settingsToCreate.push({
          user_id: workerProfile.userId,
          conversation_id: conversation.id,
        });
      }

      members.forEach((member) => {
        settingsToCreate.push({
          user_id: member.user_id,
          conversation_id: conversation.id,
        });
      });

      await this.conversationSettingModel.bulkCreate(settingsToCreate);
    }
    return conversation;
  }
}
