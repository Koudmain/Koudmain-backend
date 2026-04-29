import { Module } from '@nestjs/common';
import { SkillService } from './services/skill.service';
import { SkillController } from './controllers/skill.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Skill } from './models/skill.model';

@Module({
  providers: [SkillService],
  controllers: [SkillController],
  imports: [SequelizeModule.forFeature([Skill])],
  exports: [SkillService],
})
export class SkillModule {}
