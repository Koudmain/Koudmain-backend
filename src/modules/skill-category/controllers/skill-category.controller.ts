import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { SkillCategoryService } from '@/modules/skill-category/services/skill-category.service';
import { Public } from '@/decorators/public.decorator';

@Controller('skill-category')
export class SkillCategoryController {
  constructor(private skillCategoryService: SkillCategoryService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Get('get')
  async getAll() {
    return this.skillCategoryService.getAll();
  }
}
