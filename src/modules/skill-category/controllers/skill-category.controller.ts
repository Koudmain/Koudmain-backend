import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkillCategoryService } from '@/modules/skill-category/services/skill-category.service';
import { publicRoute } from '@/decorators/public.decorator';

@ApiTags('Skill Category')
@Controller('skill-category')
export class SkillCategoryController {
  constructor(private skillCategoryService: SkillCategoryService) {}

  @publicRoute()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lister toutes les catégories de compétences',
    description: 'Récupère la liste de toutes les catégories de métiers/compétences.',
  })
  @ApiResponse({ status: 200, description: 'Catégories récupérées avec succès.' })
  @Get('get')
  async getAll() {
    return this.skillCategoryService.getAll();
  }
}
