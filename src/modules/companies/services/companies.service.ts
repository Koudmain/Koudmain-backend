import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Company } from '@/modules/companies/models/company.model';
import { CompanyMember } from '@/modules/companies/models/company-member.model';
import { CompanyTrade } from '@/modules/companies/models/company-trade.model';
import { CreationAttributes, Transaction } from 'sequelize';
import { UpdateCompanyAddressDto } from '@/modules/address/address.dto';
import { GeocodingService } from '@/common/utils/geocoding/geocoding.service';
import { Address } from '@/modules/address/address.model';
import { EstablishmentType } from '@/modules/auth/dto/register.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company) private companyModel: typeof Company,
    @InjectModel(CompanyMember) private memberModel: typeof CompanyMember,
    @InjectModel(CompanyTrade) private companyTradeModel: typeof CompanyTrade,
    @InjectModel(Address) private addressModel: typeof Address,
    private geocodingService: GeocodingService,
  ) {}

  async createCompanyWithOwner(
    data: {
      name: string;
      establishmentType: EstablishmentType;
      ownerPosition: string;
      desiredTradeIds: number[];
      addressId?: number;
    },
    userId: number,
    transaction?: Transaction,
  ): Promise<Company> {
    const companyData: CreationAttributes<Company> = {
      name: data.name,
      establishmentType: data.establishmentType,
      ownerPosition: data.ownerPosition,
      ...(data.addressId !== undefined && { addressId: data.addressId }),
    };
    const company = await this.companyModel.create(companyData, { transaction });

    const memberData: CreationAttributes<CompanyMember> = {
      companyId: company.id,
      userId: userId,
      role: 'Owner',
    };
    await this.memberModel.create(memberData, { transaction });

    if (data.desiredTradeIds.length > 0) {
      const tradeRows = data.desiredTradeIds.map((skillCategoryId) => ({
        companyId: company.id,
        skillCategoryId,
      }));
      await this.companyTradeModel.bulkCreate(tradeRows, { transaction });
    }

    return company;
  }

  async getUserCompanies(userId: number) {
    const memberships = await this.memberModel.findAll({
      where: { userId: userId },
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
        address: companyData?.address,
      };
    });
  }

  async updateCompanyAddress(
    userId: number,
    companyId: number,
    updateAddressDto: UpdateCompanyAddressDto,
  ) {
    const membership = await this.memberModel.findOne({
      where: { userId: userId, companyId: companyId },
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

    const country = updateAddressDto.country || 'France';
    const fullAddressString =
      `${updateAddressDto.street_number || ''} ${updateAddressDto.street_name}, ${updateAddressDto.zip_code} ${updateAddressDto.city}, ${country}`.trim();

    let coords = null;
    try {
      coords = await this.geocodingService.getCoordsFromAddress(fullAddressString);
    } catch (error) {
      throw new InternalServerErrorException("Erreur lors du géocodage de l'adresse", {
        cause: error,
      });
    }

    const addressPayload = {
      ...updateAddressDto,
      country,
      full_address: fullAddressString,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    };

    if (company.address) {
      await company.address.update(addressPayload);
    } else {
      const newAddress = await this.addressModel.create(addressPayload);
      company.set('addressId', newAddress.id);
      await company.save();
    }

    return this.companyModel.findByPk(companyId, {
      include: ['address'],
    });
  }
}
