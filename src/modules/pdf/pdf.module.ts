import { Module } from '@nestjs/common';
import { PdfService } from './services/pdf.service';
import { PdfController } from './controllers/pdf.controller';

@Module({
  controllers: [PdfController],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
