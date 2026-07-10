import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CartService, CartResponse } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Request() req: { user: { id: string } }): Promise<CartResponse> {
    return this.cartService.getCart(req.user.id);
  }

  @Post('add')
  addToCart(
    @Request() req: { user: { id: string } },
    @Body() dto: AddToCartDto,
  ): Promise<CartResponse> {
    return this.cartService.addToCart(req.user.id, dto);
  }

  @Delete('remove/:id')
  removeFromCart(
    @Request() req: { user: { id: string } },
    @Param('id') cartItemId: string,
  ): Promise<CartResponse> {
    return this.cartService.removeFromCart(req.user.id, cartItemId);
  }
}
