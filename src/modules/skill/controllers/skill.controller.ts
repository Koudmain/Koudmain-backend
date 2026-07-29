import { Body, Controller, HttpCode, HttpStatus, Post, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkillService } from '@/modules/skill/services/skill.service';
import { PostSkillDto, PostSkillResponseDto, Skill } from '@/modules/skill/models/skill.model';

@ApiTags('Skill')
@Controller('skill')
export class SkillController {
  constructor(private skillService: SkillService) {}

  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer une compétence',
    description: 'Ajoute une nouvelle compétence au référentiel.',
  })
  @ApiResponse({ status: 201, description: 'Skill créé avec succès.' })
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
  @ApiOperation({
    summary: 'Lister toutes les compétences',
    description: 'Récupère la liste globale des compétences.',
  })
  @ApiResponse({ status: 200, description: 'Compétences récupérées.' })
  @Get('get')
  async get() {
    return this.skillService.getAll();
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtenir une compétence par son ID',
    description: "Récupère les détails d'une compétence spécifique.",
  })
  @ApiParam({ name: 'id', description: 'ID numérique de la compétence', type: Number })
  @ApiResponse({ status: 200, description: 'Compétence récupérée.' })
  @Get('get/:id')
  async getById(@Param('id') id: number) {
    return this.skillService.getById(id);
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Obtenir les compétences d'une catégorie",
    description: 'Récupère toutes les compétences rattachées à une catégorie donnée.',
  })
  @ApiParam({ name: 'categoryId', description: 'ID numérique de la catégorie', type: Number })
  @ApiResponse({ status: 200, description: 'Compétences récupérées.' })
  @Get('category/:categoryId')
  async getByCategoryId(@Param('categoryId') categoryId: number) {
    return this.skillService.getByCategoryId(categoryId);
  }
}
