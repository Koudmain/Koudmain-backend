import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { SkillCategoryService } from '../services/skill-category.service';

@Controller('skill-category')
export class SkillCategoryController {
  constructor(private skillCategoryService: SkillCategoryService) {}

  @HttpCode(HttpStatus.OK)
  @Get('get')
  async getAll() {
    return this.skillCategoryService.getAll();
  }
}
