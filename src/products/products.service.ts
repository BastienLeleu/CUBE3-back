import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { GetProductsDto } from './dto/get-products.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async findAll(query: GetProductsDto): Promise<Product[]> {
    const qb = this.productRepository.createQueryBuilder('product');

    // On inclut toujours le vendeur (uniquement id, prénom, nom pour des questions de sécurité)
    qb.leftJoin('product.seller', 'seller').addSelect([
      'seller.id',
      'seller.first_name',
      'seller.last_name',
    ]);

    if (query.search) {
      qb.andWhere('product.title LIKE :search', {
        search: `%${query.search}%`,
      });
    }

    if (query.category) {
      qb.andWhere('product.category = :category', { category: query.category });
    }

    if (query.condition) {
      qb.andWhere('product.condition = :condition', {
        condition: query.condition,
      });
    }

    if (query.minPrice) {
      qb.andWhere('product.price >= :minPrice', {
        minPrice: parseFloat(query.minPrice),
      });
    }

    if (query.maxPrice) {
      qb.andWhere('product.price <= :maxPrice', {
        maxPrice: parseFloat(query.maxPrice),
      });
    }

    return await qb.getMany();
  }
}
