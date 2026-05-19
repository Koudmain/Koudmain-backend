import { Body, Controller, Post, Request } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AddressService } from '../address.service';
import { CreateAddressDto } from '../address.dto';

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
    const userId = req.user.sub;

    return this.addressService.createAddress(userId, body);
  }
}
