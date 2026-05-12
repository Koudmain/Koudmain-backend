import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Company } from '@/modules/companies/models/company.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { CreationAttributes } from 'sequelize';
import { UpdateCompanyAddressDto } from '@/modules/adress/adress.dto';
import { GeocodingService } from '@/common/utils/geocoding.service';
import { Address } from '@/modules/adress/adress.model';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company) private companyModel: typeof Company,
    @InjectModel(CompanyMember) private memberModel: typeof CompanyMember,
    @InjectModel(Address) private addressModel: typeof Address,
    private geocodingService: GeocodingService,
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
          include: ['address'],
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

  async updateCompanyAddress(
    userId: number,
    companyId: number,
    update_adress_dto: UpdateCompanyAddressDto,
  ) {
    const membership = await this.memberModel.findOne({
      where: { user_id: userId, company_id: companyId },
    });

    if (!membership || membership.role !== 'Owner') {
      throw new ForbiddenException("Vous n'avez pas les droits pour modifier cette entreprise");
    }

    const company = await this.companyModel.findByPk(companyId, {
      include: ['address'],
    });

    if (!company) {
      throw new NotFoundException('Entreprise introuvable');
    }

    const { street_number, street_name, zip_code, city, country } = update_adress_dto;
    const fullAddressString = `${street_number} ${street_name}, ${zip_code} ${city}, ${country}`;

    try {
      const coords = await this.geocodingService.getCoordsFromAddress(fullAddressString);

      const addressData = {
        street_number,
        street_name,
        zip_code,
        city,
        country: country || 'France',
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null,
        full_address: fullAddressString,
        geom: coords
          ? {
              type: 'Point',
              coordinates: [coords.longitude, coords.latitude],
            }
          : null,
      };

      const existingAddress = await this.addressModel.findOne({
        where: {
          street_number,
          street_name,
          zip_code,
          city,
          country: country || 'France',
        },
      });

      if (existingAddress) {
        company.set('addressId', existingAddress.id);
        await company.save();
      } else {
        const newAddress = await this.addressModel.create(addressData);
        company.set('addressId', newAddress.id);
        await company.save();
      }

      return await this.companyModel.findByPk(company.id, {
        include: ['address'],
      });
    } catch (error) {
      throw new InternalServerErrorException(
        "Erreur lors de la mise à jour de l'adresse",
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
