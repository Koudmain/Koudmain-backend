import { Controller, Post, Body, Request, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { ChatService } from '@/modules/chat/services/chat.service';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: number;
    email: string;
  };
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  async createConversation(
    @Body() body: { publication_id: number; worker_id: number; company_id: number },
  ) {
    return this.chatService.findOrCreateConversation(
      body.publication_id,
      body.worker_id,
      body.company_id,
    );
  }

  @Get('worker/conversations')
  async getWorkerConvs(@Request() req: RequestWithUser) {
    return this.chatService.getConversationsForWorker(req.user.sub);
  }

  @Get('company/:company_id/conversations')
  async getCompanyConvs(
    @Param('company_id', ParseIntPipe) company_id: number,
    @Request() req: RequestWithUser,
  ) {
    return this.chatService.getConversationsForCompany(company_id, req.user.sub);
  }

  @Get('company/conversations/:conversation_id')
  async getCompanyConv(
    @Param('conversation_id', ParseIntPipe) conversation_id: number,
    @Request() req: RequestWithUser,
  ) {
    return this.chatService.getConversationDetailsForCompany(req.user.sub, conversation_id);
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') conversation_id: number,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    return this.chatService.getMessagesByConversation(conversation_id, limit, offset);
  }

  @Post('messages')
  async send(
    @Request() req: RequestWithUser,
    @Body() body: { conversation_id: number; content: string },
  ) {
    return this.chatService.sendMessage(req.user.sub, body.conversation_id, body.content);
  }
}
