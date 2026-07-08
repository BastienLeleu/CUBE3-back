import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockContext: Partial<ExecutionContext>;

    beforeEach(() => {
      mockContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            user: { role: 'user' },
          }),
        }),
      };
    });

    it('should return true if no roles are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      // @ts-expect-error: mock partiel
      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should throw ForbiddenException if user is missing', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      mockContext.switchToHttp = jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user: null }),
      });

      // @ts-expect-error: mock partiel
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user role is not in required roles', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

      // @ts-expect-error: mock partiel
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should return true if user role matches required roles', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['user', 'admin']);

      // @ts-expect-error: mock partiel
      expect(guard.canActivate(mockContext)).toBe(true);
    });
  });
});
