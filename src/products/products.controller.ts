import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ProductsService } from './products.service';
import { GetProductsDto } from './dto/get-products.dto';
import { Product } from './entities/product.entity';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  async findAll(
    @Query(new ValidationPipe({ transform: true })) query: GetProductsDto,
  ): Promise<{
    products: Product[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.productsService.findAll(query);
  }
}
