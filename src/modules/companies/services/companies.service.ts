import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Company } from '@/modules/companies/models/company.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { CreationAttributes } from 'sequelize';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company) private companyModel: typeof Company,
    @InjectModel(CompanyMember) private memberModel: typeof CompanyMember,
  ) {}

  async createCompanyWithOwner(name: string, userId: number): Promise<Company> {
    const companyData: CreationAttributes<Company> = { name };
    const company = await this.companyModel.create(companyData);
    const memberData: CreationAttributes<CompanyMember> = {
      company_id: company.id,
      user_id: userId,
      role: 'Owner',
    };
    await this.memberModel.create(memberData);
    return company;
  }

  async getUserCompanies(userId: number) {
    const memberships = await this.memberModel.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name'],
        },
      ],
    });

    return memberships.map((m) => {
      const companyData = m.company;

      return {
        id: companyData?.id,
        name: companyData?.name,
        role: m.role,
      };
    });
  }
}
