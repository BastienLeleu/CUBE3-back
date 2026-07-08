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
  let userRepository: { manager: { transaction: jest.Mock } };
  let configService: ConfigService;

  beforeEach(async () => {
    const mockEntityManager = {
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockUserRepository = {
      manager: {
        transaction: jest.fn(async (cb) => {
          return cb(mockEntityManager);
        }),
      },
    };

    const mockProductRepository = {};

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
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onApplicationBootstrap', () => {
    it('should skip seeding if users already exist', async () => {
      const mockManager = {
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn().mockResolvedValue([{ id: 'mockSeller' }]),
      };
      userRepository.manager.transaction.mockImplementationOnce(async (cb) =>
        cb(mockManager),
      );

      await service.onApplicationBootstrap();
      expect(mockManager.create).not.toHaveBeenCalled();
    });

    it('should skip seeding admin if ADMIN_DEFAULT_EMAIL or PASSWORD is not set', async () => {
      const mockManager = {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        save: jest.fn().mockResolvedValue({}),
      };
      userRepository.manager.transaction.mockImplementationOnce(async (cb) =>
        cb(mockManager),
      );

      (configService.get as jest.Mock).mockReturnValue(null);
      await service.onApplicationBootstrap();
      // 3 sellers + 10 products
      expect(mockManager.create).toHaveBeenCalledTimes(13);
    });

    it('should create admin user if none exists and config is provided', async () => {
      const adminMock = { email: 'admin@test.com' };
      const mockManager = {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockReturnValue(adminMock),
        save: jest.fn(),
      };
      userRepository.manager.transaction.mockImplementationOnce(async (cb) =>
        cb(mockManager),
      );

      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'ADMIN_DEFAULT_EMAIL') return 'admin@test.com';
        if (key === 'ADMIN_DEFAULT_PASSWORD') return 'password123';
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      await service.onApplicationBootstrap();

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      // Admin + 3 sellers + 10 products
      expect(mockManager.create).toHaveBeenCalledTimes(14);
      expect(mockManager.save).toHaveBeenCalledWith(User, adminMock);
    });

    it('should seed products assigned to created sellers if config is set', async () => {
      const mockSellers = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const mockManager = {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn((entity, dto) => dto),
        save: jest
          .fn()
          .mockResolvedValueOnce({ id: 'admin' })
          .mockResolvedValueOnce(mockSellers[0])
          .mockResolvedValueOnce(mockSellers[1])
          .mockResolvedValueOnce(mockSellers[2])
          .mockResolvedValue({}),
      };
      userRepository.manager.transaction.mockImplementationOnce(async (cb) =>
        cb(mockManager),
      );

      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'ADMIN_DEFAULT_EMAIL') return 'admin@test.com';
        if (key === 'ADMIN_DEFAULT_PASSWORD') return 'password123';
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      await service.onApplicationBootstrap();

      // 1 admin + 3 sellers + 10 products
      expect(mockManager.create).toHaveBeenCalledTimes(14);
      expect(mockManager.save).toHaveBeenCalledTimes(14);

      // Verify that the assigned seller is one of our mock sellers
      const calls = mockManager.create.mock.calls;
      // products start after 1 admin and 3 sellers
      for (let i = 4; i < 14; i++) {
        const productDto = calls[i][1];
        expect(mockSellers).toContain(productDto.seller);
      }
    });

    it('should not seed products if no sellers exist (e.g. error in seller creation)', async () => {
      const mockManager = {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        save: jest.fn(),
      };
      userRepository.manager.transaction.mockImplementationOnce(async (cb) =>
        cb(mockManager),
      );
      (configService.get as jest.Mock).mockReturnValue(null);

      jest
        .spyOn(
          service as unknown as { seedSellers: () => Promise<User[]> },
          'seedSellers',
        )
        .mockResolvedValue([]);

      await service.onApplicationBootstrap();

      // Ensure no products created
      const calls = mockManager.create.mock.calls;
      const productCalls = calls.filter((call) => call[0] === Product);
      expect(productCalls.length).toBe(0);
    });

    it('should log an error when the transaction rejects', async () => {
      const error = new Error('tx failed');
      userRepository.manager.transaction.mockRejectedValueOnce(error);
      const loggerErrorSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();

      await expect(service.onApplicationBootstrap()).resolves.not.toThrow();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Seeding transaction failed, rolling back...',
        error.stack,
      );
    });
  });
});
