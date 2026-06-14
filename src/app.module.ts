import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './users/entities/user.entity';
import { Product } from './products/entities/product.entity';
import { SeedingService } from './database/seeding.service';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';

@Module({
  imports: [
    // Configuration globale des variables d'environnement
    ConfigModule.forRoot({
      isGlobal: true, // Rend le ConfigService disponible partout sans l'importer explicitement
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRATION: Joi.string().default('1d'),
        ADMIN_DEFAULT_EMAIL: Joi.string().email().allow(null, '').optional(),
        ADMIN_DEFAULT_PASSWORD: Joi.string().allow(null, '').optional(),
      }),
    }),
    // Configuration de TypeORM pour PostgreSQL via DATABASE_URL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbUrl = configService.get<string>('DATABASE_URL');
        const isProduction = process.env.NODE_ENV === 'production';
        if (dbUrl) {
          return {
            type: 'postgres',
            url: dbUrl,
            autoLoadEntities: true,
            synchronize: !isProduction, // Disabled in production
          };
        }
        return {
          type: 'better-sqlite3' as const,
          database: 'database.sqlite',
          autoLoadEntities: true,
          synchronize: !isProduction,
          logging: true,
        };
      },
    }),
    // On enregistre l'entité User pour pouvoir utiliser le Repository dans SeedingService
    TypeOrmModule.forFeature([User, Product]),
    AuthModule,
    ProductsModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 30,
      },
    ]),
    CartModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SeedingService,
    {
      provide: 'APP_GUARD',
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
