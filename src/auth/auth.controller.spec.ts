import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole, UserStatus } from '../users/entities/user.entity';
import { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register and return the result', async () => {
      const dto = {
        email: 'test@test.com',
        password: 'password',
        first_name: 'John',
        last_name: 'Doe',
      };
      const expectedResult = {
        message: 'Inscription réussie',
        user: {
          id: '1',
          email: dto.email,
          first_name: dto.first_name,
          last_name: dto.last_name,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          created_at: new Date(),
          updated_at: new Date(),
          phone: null,
          avatar_url: null,
          products: [],
          cart_items: [],
        },
      };

      authService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('login', () => {
    it('should call authService.validateUser and authService.login, set cookie and return the result', async () => {
      const dto = { email: 'test@test.com', password: 'password' };
      const mockUser = { id: '1', email: 'test@test.com' };
      const expectedLoginResult = { access_token: 'token', user: mockUser };
      const expectedControllerResult = {
        message: 'Connexion réussie',
        user: mockUser,
      };

      // @ts-expect-error: mock partiel
      authService.validateUser.mockResolvedValue(mockUser);
      // @ts-expect-error: mock partiel
      authService.login.mockResolvedValue(expectedLoginResult);

      const mockResponse = {
        cookie: jest.fn(),
        clearCookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.login(dto, mockResponse);

      expect(authService.validateUser).toHaveBeenCalledWith(dto);
      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'token',
        expect.any(Object),
      );
      expect(result).toEqual(expectedControllerResult);
    });
  });

  describe('logout', () => {
    it('should clear the access_token cookie', () => {
      const mockResponse = {
        clearCookie: jest.fn(),
      } as unknown as Response;

      const result = controller.logout(mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token');
      expect(result).toEqual({ message: 'Déconnexion réussie' });
    });
  });
});
