import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthCheckResult,
  HealthIndicatorResult,
} from '@nestjs/terminus';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthCheckService;
  let dbIndicator: TypeOrmHealthIndicator;

  const mockHealthCheckService = {
    check: jest.fn(),
  };

  const mockTypeOrmHealthIndicator = {
    pingCheck: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: mockTypeOrmHealthIndicator,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthCheckService>(HealthCheckService);
    dbIndicator = module.get<TypeOrmHealthIndicator>(TypeOrmHealthIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should execute health check and delegate to db.pingCheck("database")', async () => {
      const expectedResult: HealthCheckResult = {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      };

      mockHealthCheckService.check.mockImplementationOnce(
        async (indicators: (() => Promise<HealthIndicatorResult>)[]) => {
          expect(indicators).toHaveLength(1);
          await indicators[0]();
          expect(dbIndicator.pingCheck).toHaveBeenCalledWith('database');
          expect(dbIndicator.pingCheck).toHaveBeenCalledTimes(1);
          return expectedResult;
        },
      );

      mockTypeOrmHealthIndicator.pingCheck.mockResolvedValueOnce({
        database: { status: 'up' },
      });

      const result = await controller.check();

      expect(healthService.check).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
      expect(result.status).toBe('ok');
    });

    it('should handle database health check failure', async () => {
      const expectedErrorResult: HealthCheckResult = {
        status: 'error',
        info: {},
        error: { database: { status: 'down', message: 'Connection timeout' } },
        details: {
          database: { status: 'down', message: 'Connection timeout' },
        },
      };

      mockHealthCheckService.check.mockImplementationOnce(
        async (indicators: (() => Promise<HealthIndicatorResult>)[]) => {
          expect(indicators).toHaveLength(1);
          await expect(indicators[0]()).rejects.toThrow('DB Error');
          expect(dbIndicator.pingCheck).toHaveBeenCalledWith('database');
          return expectedErrorResult;
        },
      );

      mockTypeOrmHealthIndicator.pingCheck.mockRejectedValueOnce(
        new Error('DB Error'),
      );

      const result = await controller.check();

      expect(healthService.check).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedErrorResult);
      expect(result?.status).toBe('error');
    });
  });
});
