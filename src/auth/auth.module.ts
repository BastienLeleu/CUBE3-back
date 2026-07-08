import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../users/entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (
          process.env.NODE_ENV === 'production' &&
          (!secret || secret === 'default_secret')
        ) {
          throw new Error(
            'CRITICAL SECURITY ERROR: JWT_SECRET is missing or using default_secret in production!',
          );
        }
        return {
          secret: secret || 'default_secret',
          signOptions: {
            // On doit utiliser as any car @nestjs/jwt attend le type strict StringValue de 'ms' et non pas un simple string
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expiresIn: configService.get<string>('JWT_EXPIRATION', '1d') as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
