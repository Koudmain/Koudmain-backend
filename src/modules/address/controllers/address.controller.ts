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
    summary: 'Obtenir les adresses pour la carte',
    description:
      'Recherche les adresses situées dans une zone géographique (bounding box / rayon).',
  })
  @ApiResponse({ status: 200, description: 'Adresses récupérées.' })
  @Get('/map')
  async getMapAddresses(@Query() query: GetMapAddressesDto) {
    return this.addressService.getAddressesInZone(query);
  }
}
