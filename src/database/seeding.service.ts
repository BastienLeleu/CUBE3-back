import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';

@Injectable()
export class SeedingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedingService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedAdminUser();
  }

  private async seedAdminUser(): Promise<void> {
    const userCount = await this.userRepository.count();
    if (userCount > 0) {
      this.logger.log('Database already seeded. Skipping Admin creation.');
      return;
    }

    const adminEmail = this.configService.get<string>('ADMIN_DEFAULT_EMAIL');
    const adminPassword = this.configService.get<string>(
      'ADMIN_DEFAULT_PASSWORD',
    );

    if (!adminEmail || !adminPassword) {
      this.logger.warn(
        'ADMIN_DEFAULT_EMAIL or ADMIN_DEFAULT_PASSWORD not provided. Cannot seed admin user.',
      );
      return;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    const admin = this.userRepository.create({
      email: adminEmail,
      password_hash: passwordHash,
      first_name: 'Admin',
      last_name: 'Collector',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });

    await this.userRepository.save(admin);
    this.logger.log(`Admin user created with email: ${adminEmail}`);
  }
}
