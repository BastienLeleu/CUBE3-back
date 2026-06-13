import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { ProductsService } from './products.service';
import { GetProductsDto } from './dto/get-products.dto';
import { Product } from './entities/product.entity';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(
    @Query(new ValidationPipe({ transform: true })) query: GetProductsDto,
  ): Promise<Product[]> {
    return this.productsService.findAll(query);
  }
}
