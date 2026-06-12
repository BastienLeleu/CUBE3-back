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
  let userRepository: any;
  let jwtService: any;

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
    const dto = { email: 'test@test.com', password: 'password', first_name: 'John', last_name: 'Doe' };

    it('should throw ConflictException if user already exists', async () => {
      userRepository.findOne.mockResolvedValue({ id: '1' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: dto.email } });
    });

    it('should create and return user without password', async () => {
      userRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      
      const createdUser = { ...dto, password_hash: 'hashed_password' };
      userRepository.create.mockReturnValue(createdUser);
      
      const savedUser = { id: '1', ...createdUser, role: UserRole.USER, status: UserStatus.ACTIVE };
      userRepository.save.mockResolvedValue(savedUser);

      const result = await service.register(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
      expect(userRepository.create).toHaveBeenCalledWith({ ...dto, password_hash: 'hashed_password' });
      expect(userRepository.save).toHaveBeenCalledWith(createdUser);
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...expectedUser } = savedUser;
      expect(result).toEqual({ message: 'Inscription réussie', user: expectedUser });
    });
  });

  describe('validateUser', () => {
    const loginDto = { email: 'test@test.com', password: 'password' };

    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(service.validateUser(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      userRepository.findOne.mockResolvedValue({ email: 'test@test.com', password_hash: 'hash' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.validateUser(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is banned', async () => {
      userRepository.findOne.mockResolvedValue({ email: 'test@test.com', password_hash: 'hash', status: UserStatus.BANNED });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.validateUser(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should return user if credentials are valid and user is active', async () => {
      const validUser = { id: '1', email: 'test@test.com', password_hash: 'hash', status: UserStatus.ACTIVE };
      userRepository.findOne.mockResolvedValue(validUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(loginDto);
      expect(result).toEqual(validUser);
    });
  });

  describe('login', () => {
    it('should return access_token and user object without password', async () => {
      const user = { id: '1', email: 'test@test.com', role: UserRole.USER, password_hash: 'hash' } as any;
      jwtService.sign.mockReturnValue('jwt_token');

      const result = await service.login(user);

      expect(jwtService.sign).toHaveBeenCalledWith({ sub: user.id, email: user.email, role: user.role });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...expectedUser } = user;
      expect(result).toEqual({ access_token: 'jwt_token', user: expectedUser });
    });
  });
});
