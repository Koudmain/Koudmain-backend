import { Module } from '@nestjs/common';
import { DocumensoService } from './services/documenso.service';
import { DocumensoController } from './controllers/documenso.controller';

@Module({
  providers: [DocumensoService],
  controllers: [DocumensoController],
  exports: [DocumensoService],
})
export class DocumensoModule {}
