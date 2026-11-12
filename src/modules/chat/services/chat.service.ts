import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
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

const PUBLIC_USER_ATTRIBUTES = ['id', 'first_name', 'last_name', 'profile_picture_url'];
const MAX_MESSAGES_PAGE = 100;

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
    const conv = await this.assertParticipant(userId, conversationId);

    const message = await this.messageModel.create({
      sender_id: userId,
      conversationId: conversationId,
      content_text: content,
      message_type: type,
    });
    // Conversation lists are sorted by updated_at (last message first).
    await this.conversationModel.update(
      { updated_at: new Date() },
      { where: { id: conversationId } },
    );

    const targetUserIds = new Set<number>();

    if (userId === conv.worker.userId) {
      conv.company.members.forEach((member) => {
        targetUserIds.add(member.userId);
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
    const workerId = await this.workersService.getWorkerIdByUserId(userId);
    return this.conversationModel.findAll({
      where: { workerId: workerId },
      include: ['company', 'publication'],
      order: [['updated_at', 'DESC']],
    });
  }

  async getConversationsForCompany(companyId: number, userId: number) {
    const company = await this.companyModel.findByPk(companyId);

    if (!company) throw new NotFoundException(`L'entreprise ${companyId} n'existe pas.`);
    await this.assertCompanyMember(userId, companyId);

    return this.conversationModel.findAll({
      where: { companyId: companyId },
      include: [
        {
          model: WorkerProfile,
          as: 'worker',
          include: [{ model: User, as: 'user', attributes: PUBLIC_USER_ATTRIBUTES }],
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
          limit: 1,
          order: [['created_at', 'DESC']],
        },
      ],
      order: [['updated_at', 'DESC']],
    });
  }

  async getConversationDetailsForCompany(userId: number, conversationId: number) {
    await this.assertParticipant(userId, conversationId);

    return this.conversationModel.findOne({
      where: { id: conversationId },
      include: [
        {
          model: WorkerProfile,
          as: 'worker',
          include: [{ model: User, as: 'user', attributes: PUBLIC_USER_ATTRIBUTES }],
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

  async getMessagesByConversation(
    userId: number,
    conversationId: number,
    limit: number,
    offset: number,
  ) {
    await this.assertParticipant(userId, conversationId);

    return this.messageModel.findAll({
      where: { conversationId: conversationId },
      order: [['created_at', 'DESC']],
      limit: Math.min(Math.max(limit, 1), MAX_MESSAGES_PAGE),
      offset: Math.max(offset, 0),
    });
  }

  async findOrCreateConversation(
    userId: number,
    publicationId: number,
    workerId: number,
    companyId: number,
  ) {
    const [publication, workerProfile, company] = await Promise.all([
      this.publicationModel.findByPk(publicationId),
      this.workerModel.findByPk(workerId),
      this.companyModel.findByPk(companyId),
    ]);

    if (!publication) throw new NotFoundException(`La publication ${publicationId} n'existe pas.`);
    if (!workerProfile)
      throw new NotFoundException(`Le profil travailleur ${workerId} n'existe pas.`);
    if (!company) throw new NotFoundException(`L'entreprise ${companyId} n'existe pas.`);
    if (publication.companyId !== companyId) {
      throw new BadRequestException("La publication n'appartient pas à cette entreprise.");
    }

    const members = await this.companyMemberModel.findAll({
      where: { companyId: companyId },
    });
    const isCompanyMember = members.some((member) => member.userId === userId);
    if (workerProfile.userId !== userId && !isCompanyMember) {
      throw new ForbiddenException('Vous ne participez pas à cette conversation.');
    }

    const [conversation, created] = await this.conversationModel.findOrCreate({
      where: {
        publicationId: publicationId,
        workerId: workerId,
        companyId: companyId,
      },
      defaults: {
        status: 'active',
        updated_at: new Date(),
      },
    });

    if (created) {
      if (members.length === 0) {
        throw new BadRequestException(
          'Impossible de créer une conversation pour une entreprise sans membres.',
        );
      }

      await this.conversationSettingModel.bulkCreate([
        { userId: workerProfile.userId, conversationId: conversation.id },
        ...members.map((member) => ({ userId: member.userId, conversationId: conversation.id })),
      ]);
    }
    return conversation;
  }

  // The worker of the conversation or any member of its company.
  private async assertParticipant(userId: number, conversationId: number) {
    const conv = await this.conversationModel.findByPk(conversationId, {
      include: [
        { model: WorkerProfile, as: 'worker' },
        { model: Company, as: 'company', include: ['members'] },
      ],
    });

    if (!conv) throw new NotFoundException('Conversation introuvable');

    const isParticipant =
      conv.worker?.userId === userId ||
      (conv.company?.members ?? []).some((member) => member.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('Vous ne participez pas à cette conversation.');
    }

    return conv;
  }

  private async assertCompanyMember(userId: number, companyId: number) {
    const membership = await this.companyMemberModel.findOne({ where: { userId, companyId } });
    if (!membership) throw new ForbiddenException("Vous n'êtes pas membre de cette entreprise.");
  }
}
