import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AddressService } from '@/modules/address/services/address.service';
import { GetMapAddressesDto } from '@/modules/address/address.dto';

@ApiTags('Address')
@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @ApiOperation({
    summary: 'Obtenir les annonces ouvertes pour la carte',
    description:
      'Renvoie les annonces ouvertes situées dans une zone (bounding box). `id` est celui de la publication.',
  })
  @ApiResponse({ status: 200, description: 'Adresses récupérées.' })
  @Get('/map')
  async getMapAddresses(@Query() query: GetMapAddressesDto) {
    return this.addressService.getPublicationsInZone(query);
  }
}
