import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product, ProductCondition } from './entities/product.entity';

describe('ProductsService', () => {
  let service: ProductsService;

  // Mocking QueryBuilder
  const mockQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all products with seller relation without any filters', async () => {
      const result = [{ id: '1', title: 'Product 1' }];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([result, 1]);

      const products = await service.findAll({});
      expect(products).toEqual({
        products: result,
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('product');
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'product.seller',
        'seller',
      );
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith([
        'seller.id',
        'seller.first_name',
        'seller.last_name',
      ]);
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should apply search filter', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll({ search: 'test' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.title LIKE :search',
        { search: '%test%' },
      );
    });

    it('should apply category filter', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll({ category: 'Livres' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.category = :category',
        { category: 'Livres' },
      );
    });

    it('should apply condition filter', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll({ condition: ProductCondition.NEW });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.condition = :condition',
        { condition: ProductCondition.NEW },
      );
    });

    it('should apply minPrice filter', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll({ minPrice: '10.5' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.price >= :minPrice',
        { minPrice: 10.5 },
      );
    });

    it('should apply maxPrice filter', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll({ maxPrice: '50' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.price <= :maxPrice',
        { maxPrice: 50 },
      );
    });

    it('should apply all filters simultaneously', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll({
        search: 'test',
        category: 'Livres',
        condition: ProductCondition.USED,
        minPrice: '10',
        maxPrice: '100',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(5);
    });

    it('should apply pagination parameters (page and limit)', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll({ page: 3, limit: 10 });
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20); // (3-1) * 10
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should use default pagination parameters if not provided', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      await service.findAll({});
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0); // (1-1) * 20
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });
  });
});
