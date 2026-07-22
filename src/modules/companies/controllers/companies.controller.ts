import { Body, Controller, Get, Param, ParseIntPipe, Put, Request } from '@nestjs/common';
import { CompaniesService } from '@/modules/companies/services/companies.service';
import { UpdateCompanyAddressDto } from '@/modules/address/address.dto';
import { type RequestWithUser } from '@/common/types/request.type';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('my-companies')
  async getMyCompanies(@Request() req: RequestWithUser) {
    const userId = req.user.sub;

    return this.companiesService.getUserCompanies(userId);
  }

  @Put(':companyId/address')
  async updateCompanyAddress(
    @Request() req: RequestWithUser,
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() body: UpdateCompanyAddressDto,
  ) {
    const userId = req.user.sub;

    return this.companiesService.updateCompanyAddress(userId, companyId, body);
  }
}
