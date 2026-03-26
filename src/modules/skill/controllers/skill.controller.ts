import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Param,
  Put,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { SkillService } from '../services/skill.service';
import { PostSkillResponseDto, Skill } from '../models/skill.model';

@Controller('skill')
export class SkillController {
  constructor(private skillService: SkillService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('create')
  async create(@Body() createDto: Record<string, any>) {
    const skill: Skill = await this.skillService.create(createDto);

    const res: PostSkillResponseDto = {
      message: 'Skill créé avec succès',
      id: skill.id,
    };

    return res;
  }

  @HttpCode(HttpStatus.OK)
  @Get('get')
  async get() {
    return this.skillService.getAll();
  }

  @HttpCode(HttpStatus.OK)
  @Get('get/:id')
  async getById(@Param('id') id: number) {
    return this.skillService.getById(id);
  }
}
