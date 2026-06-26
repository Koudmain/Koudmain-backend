import { Controller, Get } from '@nestjs/common';
import { DocumensoService } from '../services/documenso.service';

@Controller('documenso')
export class DocumensoController {
  constructor(private readonly documensoService: DocumensoService) {}

  @Get('test-signature')
  async triggerTest() {
    const urlSignature =
      await this.documensoService.createContractForSignature('tonemail@test.com');

    return { url: urlSignature };
  }
}
