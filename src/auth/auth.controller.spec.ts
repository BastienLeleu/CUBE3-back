import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

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
      const dto = { email: 'test@test.com', password: 'password', first_name: 'John', last_name: 'Doe' };
      const expectedResult = { message: 'Inscription réussie', user: { id: '1', ...dto, role: 'user' as any, status: 'active' as any, created_at: new Date(), updated_at: new Date() } };
      
      authService.register.mockResolvedValue(expectedResult as any);

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('login', () => {
    it('should call authService.validateUser and authService.login and return the result', async () => {
      const dto = { email: 'test@test.com', password: 'password' };
      const mockUser = { id: '1', email: 'test@test.com' };
      const expectedResult = { access_token: 'token', user: mockUser };
      
      authService.validateUser.mockResolvedValue(mockUser as any);
      authService.login.mockResolvedValue(expectedResult as any);

      const result = await controller.login(dto);

      expect(authService.validateUser).toHaveBeenCalledWith(dto);
      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(expectedResult);
    });
  });
});
