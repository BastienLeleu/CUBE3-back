import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthCheck,
  HealthCheckResult,
  HealthIndicatorResult,
} from '@nestjs/terminus';

@Controller('api/health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      (): Promise<HealthIndicatorResult> => this.db.pingCheck('database'),
    ]);
  }
}
