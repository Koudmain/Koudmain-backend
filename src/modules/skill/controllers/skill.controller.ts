import { Body, Controller, HttpCode, HttpStatus, Post, Get, Param } from '@nestjs/common';
import { SkillService } from '@/modules/skill/services/skill.service';
import { PostSkillDto, PostSkillResponseDto, Skill } from '@/modules/skill/models/skill.model';

@Controller('skill')
export class SkillController {
  constructor(private skillService: SkillService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('create')
  async create(@Body() createDto: PostSkillDto) {
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

  @HttpCode(HttpStatus.OK)
  @Get('category/:categoryId')
  async getByCategoryId(@Param('categoryId') categoryId: number) {
    return this.skillService.getByCategoryId(categoryId);
  }
}
