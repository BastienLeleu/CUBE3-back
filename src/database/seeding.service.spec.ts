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
  });
});
