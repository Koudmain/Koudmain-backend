import { Body, Controller, Get, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { AddressService } from '@/modules/address/services/address.service';
import { CreateAddressDto, GetMapAddressesDto } from '@/modules/address/address.dto';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: number;
    email: string;
  };
}

@ApiTags('Address')
@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Créer une adresse',
    description: 'Enregistre une nouvelle adresse géographique.',
  })
  @ApiResponse({ status: 201, description: 'Adresse créée.' })
  @Post('/')
  async createAddress(@Request() req: RequestWithUser, @Body() body: CreateAddressDto) {
    return this.addressService.createAddress(body);
  }

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
