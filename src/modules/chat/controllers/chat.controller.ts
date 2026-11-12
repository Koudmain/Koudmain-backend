import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { ChatService } from '@/modules/chat/services/chat.service';
import { CreateConversationDto } from '@/modules/chat/dto/create-conversation.dto';
import { SendMessageDto } from '@/modules/chat/dto/send-message.dto';
import { Roles } from '@/decorators/roles.decorator';
import { UserRole } from '@/modules/users/models/user.model';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: number;
    email: string;
  };
}

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiOperation({
    summary: 'Créer ou récupérer une conversation',
    description:
      'Trouve une conversation existante ou en crée une nouvelle pour une publication, un worker et une entreprise.',
  })
  @ApiResponse({ status: 201, description: 'Conversation initialisée.' })
  @Post('conversations')
  async createConversation(@Request() req: RequestWithUser, @Body() body: CreateConversationDto) {
    return this.chatService.findOrCreateConversation(
      req.user.sub,
      body.publicationId,
      body.workerId,
      body.companyId,
    );
  }

  @ApiOperation({
    summary: "Obtenir les conversations d'un travailleur",
    description: 'Retourne la liste des conversations du worker connecté.',
  })
  @ApiResponse({ status: 200, description: 'Conversations récupérées.' })
  @ApiResponse({ status: 403, description: 'Permission insuffisante.' })
  @Roles(UserRole.WORKER)
  @Get('worker/conversations')
  async getWorkerConvs(@Request() req: RequestWithUser) {
    return this.chatService.getConversationsForWorker(req.user.sub);
  }

  @ApiOperation({
    summary: "Obtenir les conversations d'une entreprise",
    description: 'Retourne la liste des conversations rattachées à une entreprise donnée.',
  })
  @ApiParam({ name: 'companyId', description: "ID numérique de l'entreprise", type: Number })
  @ApiResponse({ status: 200, description: 'Conversations récupérées.' })
  @ApiResponse({ status: 403, description: 'Permission insuffisante.' })
  @Roles(UserRole.EMPLOYER)
  @Get('company/:companyId/conversations')
  async getCompanyConvs(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.chatService.getConversationsForCompany(companyId, req.user.sub);
  }

  @ApiOperation({
    summary: "Obtenir le détail d'une conversation entreprise",
    description: "Récupère les détails d'une conversation spécifique côté entreprise.",
  })
  @ApiParam({
    name: 'conversationId',
    description: 'ID numérique de la conversation',
    type: Number,
  })
  @ApiResponse({ status: 200, description: 'Détails de la conversation récupérés.' })
  @ApiResponse({ status: 403, description: 'Permission insuffisante.' })
  @Roles(UserRole.EMPLOYER)
  @Get('company/conversations/:conversationId')
  async getCompanyConv(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Request() req: RequestWithUser,
  ) {
    return this.chatService.getConversationDetailsForCompany(req.user.sub, conversationId);
  }

  @ApiOperation({
    summary: "Obtenir l'historique des messages d'une conversation",
    description: "Récupère la liste paginée des messages d'une conversation.",
  })
  @ApiParam({ name: 'id', description: 'ID numérique de la conversation', type: Number })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Nombre max de messages à retourner (par défaut 20, max 100)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Décalage pour la pagination (par défaut 0)',
  })
  @ApiResponse({ status: 200, description: 'Messages récupérés.' })
  @Get('conversations/:id/messages')
  async getMessages(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) conversationId: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.chatService.getMessagesByConversation(req.user.sub, conversationId, limit, offset);
  }

  @ApiOperation({
    summary: 'Envoyer un message',
    description: 'Envoie un nouveau message dans une conversation.',
  })
  @ApiResponse({ status: 201, description: 'Message envoyé.' })
  @Post('messages')
  async send(@Request() req: RequestWithUser, @Body() body: SendMessageDto) {
    return this.chatService.sendMessage(req.user.sub, body.conversationId, body.content);
  }
}
