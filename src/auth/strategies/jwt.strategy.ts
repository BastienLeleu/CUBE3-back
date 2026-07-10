import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Request } from 'express';

export const cookieExtractor = (req: Request): string | null => {
  return req?.cookies?.['access_token'] || null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (
      process.env.NODE_ENV === 'production' &&
      (!secret || secret === 'default_secret')
    ) {
      throw new Error(
        'CRITICAL SECURITY ERROR: JWT_SECRET is missing or using default_secret in production!',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: secret || 'default_secret',
    });
  }

  async validate(payload: { sub: string }): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user || user.status === 'banned') {
      throw new UnauthorizedException('Accès refusé');
    }
    return user;
  }
}
