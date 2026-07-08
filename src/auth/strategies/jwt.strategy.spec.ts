import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserStatus } from '../../users/entities/user.entity';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: Record<string, jest.Mock>;

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test_secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userRepository = module.get(getRepositoryToken(User));
  });

  describe('validate', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(strategy.validate({ sub: '1' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is banned', async () => {
      userRepository.findOne.mockResolvedValue({
        id: '1',
        status: UserStatus.BANNED,
      });
      await expect(strategy.validate({ sub: '1' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return user if valid', async () => {
      const user = { id: '1', status: UserStatus.ACTIVE };
      userRepository.findOne.mockResolvedValue(user);
      const result = await strategy.validate({ sub: '1' });
      expect(result).toEqual(user);
    });
  });
});
