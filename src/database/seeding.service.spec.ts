import { Test, TestingModule } from '@nestjs/testing';
import { SeedingService } from './seeding.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('SeedingService', () => {
  let service: SeedingService;
  let userRepository: Record<string, jest.Mock>;
  let productRepository: Record<string, jest.Mock>;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockUserRepository = {
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockProductRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedingService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SeedingService>(SeedingService);
    userRepository = module.get(getRepositoryToken(User));
    productRepository = module.get(getRepositoryToken(Product));
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onApplicationBootstrap', () => {
    it('should skip seeding if users already exist', async () => {
      userRepository.count.mockResolvedValue(1);
      await service.onApplicationBootstrap();
      expect(configService.get).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should skip seeding admin if ADMIN_DEFAULT_EMAIL or PASSWORD is not set', async () => {
      userRepository.count.mockResolvedValue(0);
      (configService.get as jest.Mock).mockReturnValue(null);
      userRepository.save.mockResolvedValue({});
      await service.onApplicationBootstrap();
      // Only 3 sellers are created
      expect(userRepository.create).toHaveBeenCalledTimes(3);
    });

    it('should create admin user if none exists and config is provided', async () => {
      userRepository.count.mockResolvedValue(0);
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'ADMIN_DEFAULT_EMAIL') return 'admin@test.com';
        if (key === 'ADMIN_DEFAULT_PASSWORD') return 'password123';
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const adminMock = { email: 'admin@test.com' };
      userRepository.create.mockReturnValue(adminMock);

      await service.onApplicationBootstrap();

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      // Admin + 3 sellers
      expect(userRepository.create).toHaveBeenCalledTimes(4);
      expect(userRepository.save).toHaveBeenCalledWith(adminMock);
    });

    it('should seed products assigned to created sellers if config is set', async () => {
      userRepository.count.mockResolvedValue(0);
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'ADMIN_DEFAULT_EMAIL') return 'admin@test.com';
        if (key === 'ADMIN_DEFAULT_PASSWORD') return 'password123';
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const mockSellers = [{ id: '1' }, { id: '2' }, { id: '3' }];

      // Mock userRepository.save to return sellers (admin first, then the 3 sellers)
      userRepository.save
        .mockResolvedValueOnce({ id: 'admin' })
        .mockResolvedValueOnce(mockSellers[0])
        .mockResolvedValueOnce(mockSellers[1])
        .mockResolvedValueOnce(mockSellers[2]);

      productRepository.create.mockImplementation((dto) => dto);
      productRepository.save.mockResolvedValue({});

      await service.onApplicationBootstrap();

      // 10 products should be created
      expect(productRepository.create).toHaveBeenCalledTimes(10);
      expect(productRepository.save).toHaveBeenCalledTimes(10);

      // Verify that the assigned seller is one of our mock sellers
      const calls = productRepository.create.mock.calls;
      for (let i = 0; i < 10; i++) {
        const productDto = calls[i][0];
        expect(mockSellers).toContain(productDto.seller);
      }
    });

    it('should not seed products if no sellers exist (e.g. error in seller creation)', async () => {
      userRepository.count.mockResolvedValue(0);
      (configService.get as jest.Mock).mockReturnValue(null);

      // If save returns nothing or we simulate no sellers returned
      // The implementation actually pushes whatever save() returns.
      // If we mock save to return null, the array will have nulls.
      // If we want to simulate 0 sellers, we could spy on seedSellers or mock it,
      // but seedSellers is private. Let's mock userRepository.save to throw or just
      // test the condition if sellers.length === 0. Actually, since seedSellers always pushes 3 elements,
      // the only way sellers.length is 0 is if we mock the method or change the implementation.
      // But we can mock userRepository.save to return empty or we can test by mocking seedSellers using any.
      // Let's use `jest.spyOn(service as any, 'seedSellers').mockResolvedValue([])`
      jest
        .spyOn(
          service as unknown as { seedSellers: () => Promise<User[]> },
          'seedSellers',
        )
        .mockResolvedValue([]);

      await service.onApplicationBootstrap();

      expect(productRepository.create).not.toHaveBeenCalled();
      expect(productRepository.save).not.toHaveBeenCalled();
    });
  });
});
