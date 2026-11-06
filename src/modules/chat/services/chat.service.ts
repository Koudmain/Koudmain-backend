import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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
    conversationId: number,
    content: string,
    type: string = 'TEXT',
  ) {
    if (!content || content.trim() === '') {
      throw new BadRequestException('Le contenu du message ne peut pas être vide.');
    }

    const conv = await this.conversationModel.findByPk(conversationId, {
      include: [
        { model: WorkerProfile, as: 'worker' },
        { model: Company, as: 'company', include: ['members'] },
      ],
    });

    if (!conv) {
      throw new NotFoundException('Conversation introuvable');
    }

    const isWorker = conv.worker && conv.worker.userId === userId;
    const isCompanyMember = conv.company?.members?.some((member) => member.userId === userId);

    if (!isWorker && !isCompanyMember) {
      throw new ForbiddenException(
        "Vous n'avez pas l'autorisation d'envoyer un message dans cette conversation.",
      );
    }

    const message = await this.messageModel.create({
      sender_id: userId,
      conversationId: conversationId,
      content_text: content,
      message_type: type,
    });

    await this.conversationModel.update(
      { updated_at: new Date() },
      { where: { id: conversationId } },
    );

    const targetUserIds = new Set<number>();

    if (isWorker) {
      conv.company?.members?.forEach((member) => {
        targetUserIds.add(member.userId);
      });
    } else if (conv.worker?.userId) {
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
    const workerId = await this.workersService.getWorkerIdByUserId(userId);
    return this.conversationModel.findAll({
      where: { workerId: workerId },
      include: [
        'company',
        'publication',
        {
          model: ConversationSetting,
          as: 'settings',
          where: { userId: userId },
          required: false,
        },
        {
          model: Message,
          as: 'last_message',
          separate: true,
          limit: 1,
          order: [['created_at', 'DESC']],
        },
      ],
      order: [['updated_at', 'DESC']],
    });
  }

  async getConversationsForCompany(companyId: number, userId: number) {
    const company = await this.companyModel.findByPk(companyId);

    if (!company) throw new NotFoundException(`L'entreprise ${companyId} n'existe pas.`);
    return this.conversationModel.findAll({
      where: { companyId: companyId },
      include: [
        {
          model: WorkerProfile,
          as: 'worker',
          include: [{ model: User, as: 'user', attributes: { exclude: ['password'] } }],
        },
        {
          model: ConversationSetting,
          as: 'settings',
          where: { userId: userId },
          required: false,
        },
        'publication',
        {
          model: Message,
          as: 'last_message',
          separate: true,
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
          where: { userId: userId },
          required: false,
        },
        'publication',
      ],
    });
  }

  async getMessagesByConversation(conversationId: number, limit: number, offset: number) {
    return this.messageModel.findAll({
      where: { conversationId: conversationId },
      order: [['created_at', 'DESC']],
      limit: limit,
      offset: offset,
    });
  }

  async getConversationMessages(conversationId: number) {
    return this.messageModel.findAll({
      where: { conversationId: conversationId },
      order: [['created_at', 'ASC']],
    });
  }

  async findOrCreateConversation(publicationId: number, workerId: number, companyId: number) {
    const publication = await this.publicationModel.findByPk(publicationId);
    if (!publication) {
      throw new NotFoundException(`La publication ${publicationId} n'existe pas.`);
    }

    let workerProfile = await this.workerModel.findByPk(workerId);
    if (!workerProfile) {
      workerProfile = await this.workerModel.findOne({ where: { userId: workerId } });
    }
    if (!workerProfile) {
      throw new NotFoundException(`Le profil travailleur ${workerId} n'existe pas.`);
    }

    const company = await this.companyModel.findByPk(companyId);
    if (!company) {
      throw new NotFoundException(`L'entreprise ${companyId} n'existe pas.`);
    }

    const [conversation, created] = await this.conversationModel.findOrCreate({
      where: {
        publicationId: publicationId,
        workerId: workerProfile.id,
        companyId: companyId,
      },
      defaults: {
        status: 'active',
        updated_at: new Date(),
      },
    });

    if (created) {
      const members = await this.companyMemberModel.findAll({
        where: { companyId: companyId },
      });
      if (members.length === 0) {
        throw new BadRequestException(
          'Impossible de créer une conversation pour une entreprise sans membres.',
        );
      }

      const settingsToCreate = [];

      if (workerProfile) {
        settingsToCreate.push({
          userId: workerProfile.userId,
          conversationId: conversation.id,
        });
      }

      members.forEach((member) => {
        if (member.userId !== workerProfile.userId) {
          settingsToCreate.push({
            userId: member.userId,
            conversationId: conversation.id,
          });
        }
      });

      await this.conversationSettingModel.bulkCreate(settingsToCreate);
    }
    return conversation;
  }
}
