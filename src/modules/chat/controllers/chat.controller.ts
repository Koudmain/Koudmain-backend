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
    @Request() req: RequestWithUser,
    @Body() body: { publicationId: number; workerId: number; companyId: number },
  ) {
    return this.chatService.findOrCreateConversation(
      body.publicationId,
      body.workerId,
      body.companyId,
    );
  }

  @Get('worker/conversations')
  async getWorkerConvs(@Request() req: RequestWithUser) {
    return this.chatService.getConversationsForWorker(req.user.sub);
  }

  @Get('company/:companyId/conversations')
  async getCompanyConvs(@Param('companyId', ParseIntPipe) companyId: number) {
    return this.chatService.getConversationsForCompany(companyId);
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') conversationId: number,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
  ) {
    return this.chatService.getMessagesByConversation(conversationId, limit, offset);
  }

  @Post('messages')
  async send(
    @Request() req: RequestWithUser,
    @Body() body: { conversationId: number; content: string },
  ) {
    return this.chatService.sendMessage(req.user.sub, body.conversationId, body.content);
  }
}
