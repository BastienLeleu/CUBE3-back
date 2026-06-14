import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { Product, ProductCondition } from './entities/product.entity';
import { GetProductsDto } from './dto/get-products.dto';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockProductsService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 10,
          },
        ]),
      ],
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call productsService.findAll with the provided query', async () => {
      const query = {
        search: 'test',
        category: 'Jeux Vidéo',
        page: 1,
        limit: 20,
      };
      const expectedResult = {
        products: [{ id: '1', title: 'Product 1' } as unknown as Product],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockProductsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should call productsService.findAll with an empty object when no query params are provided', async () => {
      const query = { page: 1, limit: 20 };
      const expectedResult = {
        products: [{ id: '2', title: 'Product 2' } as unknown as Product],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockProductsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should call productsService.findAll with a single condition parameter', async () => {
      const query = { condition: ProductCondition.NEW, page: 1, limit: 20 };
      const expectedResult = {
        products: [{ id: '3', title: 'Product 3' } as unknown as Product],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockProductsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should call productsService.findAll with minPrice and maxPrice', async () => {
      const query = { minPrice: '10', maxPrice: '100', page: 1, limit: 20 };
      const expectedResult = {
        products: [{ id: '4', title: 'Product 4' } as unknown as Product],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockProductsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should forward validation errors or exceptions thrown during execution', async () => {
      const query = { minPrice: 'abc' } as unknown as GetProductsDto;
      const error = new Error('Validation failed');

      mockProductsService.findAll.mockRejectedValue(error);

      await expect(controller.findAll(query)).rejects.toThrow(
        'Validation failed',
      );
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
    it('should call productsService.findAll with pagination parameters', async () => {
      const query: GetProductsDto = { page: 2, limit: 10 };
      const expectedResult = {
        products: [{ id: '5', title: 'Product 5' } as unknown as Product],
        total: 15,
        page: 2,
        limit: 10,
      };

      mockProductsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(query);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should be protected by ThrottlerGuard for rate-limiting', () => {
      const guards = Reflect.getMetadata('__guards__', ProductsController);
      expect(guards).toBeDefined();
      expect(guards).toContain(ThrottlerGuard);
    });
  });
});
