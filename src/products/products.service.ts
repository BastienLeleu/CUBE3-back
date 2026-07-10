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

  async findAll(query: GetProductsDto): Promise<{
    products: Product[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb = this.productRepository.createQueryBuilder('product');

    // On inclut toujours le vendeur (uniquement id, prénom, nom pour des questions de sécurité)
    qb.leftJoin('product.seller', 'seller').addSelect([
      'seller.id',
      'seller.first_name',
      'seller.last_name',
    ]);

    if (query.search) {
      // Échappement des caractères spéciaux %, _ et \ pour éviter les requêtes lentes/ReDoS et failles SQL
      const escapedSearch = query.search.replace(/[\\%_]/g, String.raw`\$&`);
      qb.andWhere('product.title ILIKE :search', {
        search: `%${escapedSearch}%`,
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
        minPrice: Number.parseFloat(query.minPrice),
      });
    }

    if (query.maxPrice) {
      qb.andWhere('product.price <= :maxPrice', {
        maxPrice: Number.parseFloat(query.maxPrice),
      });
    }

    const page = query.page || 1;
    let limit = query.limit || 20;
    const MAX_LIMIT = 100;
    if (limit > MAX_LIMIT) {
      limit = MAX_LIMIT;
    }
    const skip = (page - 1) * limit;

    qb.orderBy('product.created_at', 'DESC')
      .addOrderBy('product.id', 'ASC')
      .skip(skip)
      .take(limit);

    const [products, total] = await qb.getManyAndCount();

    return {
      products,
      total,
      page,
      limit,
    };
  }
}
