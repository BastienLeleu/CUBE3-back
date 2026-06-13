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
    getMany: jest.fn(),
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
      mockQueryBuilder.getMany.mockResolvedValue(result);

      const products = await service.findAll({});
      expect(products).toEqual(result);
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
      mockQueryBuilder.getMany.mockResolvedValue([]);
      await service.findAll({ search: 'test' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.title LIKE :search',
        { search: '%test%' },
      );
    });

    it('should apply category filter', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      await service.findAll({ category: 'Livres' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.category = :category',
        { category: 'Livres' },
      );
    });

    it('should apply condition filter', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      await service.findAll({ condition: ProductCondition.NEW });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.condition = :condition',
        { condition: ProductCondition.NEW },
      );
    });

    it('should apply minPrice filter', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      await service.findAll({ minPrice: '10.5' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.price >= :minPrice',
        { minPrice: 10.5 },
      );
    });

    it('should apply maxPrice filter', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      await service.findAll({ maxPrice: '50' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.price <= :maxPrice',
        { maxPrice: 50 },
      );
    });

    it('should apply all filters simultaneously', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      await service.findAll({
        search: 'test',
        category: 'Livres',
        condition: ProductCondition.USED,
        minPrice: '10',
        maxPrice: '100',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(5);
    });
  });
});
