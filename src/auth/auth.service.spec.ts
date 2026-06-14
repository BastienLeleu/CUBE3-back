import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto = {
      email: 'test@test.com',
      password: 'password',
      first_name: 'John',
      last_name: 'Doe',
    };

    it('should throw ConflictException if user already exists', async () => {
      userRepository.findOne.mockResolvedValue({ id: '1' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
    });

    it('should create and return user without password', async () => {
      userRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const createdUser = { ...dto, password_hash: 'hashed_password' };
      userRepository.create.mockReturnValue(createdUser);

      const savedUser = {
        id: '1',
        ...createdUser,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      };
      userRepository.save.mockResolvedValue(savedUser);

      const result = await service.register(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password', 12);
      expect(userRepository.create).toHaveBeenCalledWith({
        ...dto,
        password_hash: 'hashed_password',
      });
      expect(userRepository.save).toHaveBeenCalledWith(createdUser);

      expect(result.user).not.toHaveProperty('password');
      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.user.email).toBe(dto.email);
      expect(result.user.first_name).toBe(dto.first_name);
      expect(result.user.last_name).toBe(dto.last_name);
      expect(result.user.role).toBe(UserRole.USER);
      expect(result.user.status).toBe(UserStatus.ACTIVE);
      expect(result.user.products).toEqual([]);
      expect(result.user.cart_items).toEqual([]);
    });
  });

  describe('validateUser', () => {
    const loginDto = { email: 'test@test.com', password: 'password' };

    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(service.validateUser(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      userRepository.findOne.mockResolvedValue({
        email: 'test@test.com',
        password_hash: 'hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.validateUser(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is banned', async () => {
      userRepository.findOne.mockResolvedValue({
        email: 'test@test.com',
        password_hash: 'hash',
        status: UserStatus.BANNED,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.validateUser(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return user if credentials are valid and user is active', async () => {
      const validUser = {
        id: '1',
        email: 'test@test.com',
        password_hash: 'hash',
        status: UserStatus.ACTIVE,
      };
      userRepository.findOne.mockResolvedValue(validUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(loginDto);
      expect(result).toEqual(validUser);
    });
  });

  describe('login', () => {
    it('should return access_token and user object without password', async () => {
      const user = {
        id: '1',
        email: 'test@test.com',
        role: UserRole.USER,
        password_hash: 'hash',
      } as unknown as User;
      jwtService.sign.mockReturnValue('jwt_token');

      const result = await service.login(user);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      expect(result.access_token).toBe('jwt_token');
      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.user.id).toBe(user.id);
      expect(result.user.email).toBe(user.email);
      expect(result.user.role).toBe(user.role);
      expect(result.user.products).toEqual([]);
      expect(result.user.cart_items).toEqual([]);
    });

    it('should return user with products if user has products', async () => {
      const user = {
        id: '2',
        email: 'seller@test.com',
        role: UserRole.USER,
        password_hash: 'hash2',
        products: [{ id: 'p1', title: 'Product 1' }],
      } as unknown as User;
      jwtService.sign.mockReturnValue('jwt_token');

      const result = await service.login(user);

      expect(result.user.products).toEqual(user.products);
      expect(result.user.cart_items).toEqual([]);
      expect(result.user).not.toHaveProperty('password_hash');
    });
  });
});
