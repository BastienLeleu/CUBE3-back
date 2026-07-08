import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string; user: Omit<User, 'password_hash'> }> {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

    const newUser = this.userRepository.create({
      ...registerDto,
      password_hash: passwordHash,
    });

    const savedUser = await this.userRepository.save(newUser);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = savedUser;

    return {
      message: 'Inscription réussie',
      user: userWithoutPassword,
    };
  }

  async validateUser(loginDto: LoginDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (user.status === 'banned') {
      throw new UnauthorizedException('Ce compte a été banni');
    }

    return user;
  }

  async login(user: User): Promise<{ access_token: string; user: Omit<User, 'password_hash'> }> {
    const payload = { sub: user.id, email: user.email, role: user.role };
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = user;

    return {
      access_token: this.jwtService.sign(payload),
      user: userWithoutPassword,
    };
  }
}
