import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './users/entities/user.entity';
import { SeedingService } from './database/seeding.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // Configuration globale des variables d'environnement
    ConfigModule.forRoot({
      isGlobal: true, // Rend le ConfigService disponible partout sans l'importer explicitement
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRATION: Joi.string().default('1d'),
        ADMIN_DEFAULT_EMAIL: Joi.string().email().optional(),
        ADMIN_DEFAULT_PASSWORD: Joi.string().optional(),
      }),
    }),
    // Configuration de TypeORM pour PostgreSQL via DATABASE_URL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        type: 'better-sqlite3' as const,
        database: 'database.sqlite',
        autoLoadEntities: true,
        synchronize: true, // ATTENTION: À désactiver en production pure
      }),
    }),
    // On enregistre l'entité User pour pouvoir utiliser le Repository dans SeedingService
    TypeOrmModule.forFeature([User]),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedingService],
})
export class AppModule {}
