import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumensoService } from './services/documenso.service';

@Module({
  imports: [ConfigModule],
  providers: [DocumensoService],
  exports: [DocumensoService],
})
export class DocumensoModule {}
