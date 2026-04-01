import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Company } from '@/modules/companies/models/company.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company) private companyModel: typeof Company,
    @InjectModel(CompanyMember) private memberModel: typeof CompanyMember,
  ) {}

  async createCompanyWithOwner(name: string, userId: number): Promise<Company> {
    const company = await this.companyModel.create({ name } as any);
    await this.memberModel.create({
      company_id: company.id,
      user_id: userId,
      role: 'Owner',
    } as any);
    return company;
  }

  async getUserCompanies(userId: number) {
    const memberships = await this.memberModel.findAll({
      where: { user_id: userId },
      include: [{
        model: Company,
        attributes: ['id', 'name'],
      }],
    });

    return memberships.map((m) => {
      const companyData = m.get('company') as Company;

      return {
        id: companyData?.id,
        name: companyData?.name,
        role: m.role,
      };
    });
  }
}