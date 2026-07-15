import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { SkillCategoryService } from '@/modules/skill-category/services/skill-category.service';
import { publicRoute } from '@/decorators/public.decorator';

@Controller('skill-category')
export class SkillCategoryController {
  constructor(private skillCategoryService: SkillCategoryService) {}

  @publicRoute()
  @HttpCode(HttpStatus.OK)
  @Get('get')
  async getAll() {
    return this.skillCategoryService.getAll();
  }
}
