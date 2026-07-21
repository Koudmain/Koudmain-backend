import { Body, Controller, Get, Post, Query, Request } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AddressService } from '@/modules/address/services/address.service';
import { CreateAddressDto, GetMapAddressesDto } from '@/modules/address/address.dto';

interface RequestWithUser extends ExpressRequest {
  user: {
    sub: number;
    email: string;
  };
}

@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post('/')
  async createAddress(@Request() req: RequestWithUser, @Body() body: CreateAddressDto) {
    return this.addressService.createAddress(body);
  }

  @Get('/map')
  async getMapAddresses(@Query() query: GetMapAddressesDto) {
    return this.addressService.getAddressesInZone(query);
  }
}
