import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { Product, ProductCondition } from '../products/entities/product.entity';

@Injectable()
export class SeedingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedingService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const userCount = await this.userRepository.count();
    if (userCount > 0) {
      this.logger.log('Database already seeded. Skipping initialization.');
      return;
    }

    await this.seedAdminUser();
    const sellers = await this.seedSellers();
    if (sellers.length > 0) {
      await this.seedProducts(sellers);
    }
  }

  private async seedAdminUser(): Promise<void> {
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

  private async seedSellers(): Promise<User[]> {
    const saltRounds = 10;

    let sellerPassword = this.configService.get<string>(
      'SELLER_DEFAULT_PASSWORD',
    );
    if (!sellerPassword) {
      sellerPassword = crypto.randomBytes(16).toString('hex');
      this.logger.log(
        'No SELLER_DEFAULT_PASSWORD provided. Generated a secure random password for sellers.',
      );
    }

    const passwordHash = await bcrypt.hash(sellerPassword, saltRounds);

    const sellersData = [
      { email: 'seller1@test.com', first_name: 'Alice', last_name: 'Smith' },
      { email: 'seller2@test.com', first_name: 'Bob', last_name: 'Johnson' },
      { email: 'seller3@test.com', first_name: 'Charlie', last_name: 'Brown' },
    ];

    const sellers: User[] = [];
    for (const data of sellersData) {
      const seller = this.userRepository.create({
        email: data.email,
        password_hash: passwordHash,
        first_name: data.first_name,
        last_name: data.last_name,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      });
      sellers.push(await this.userRepository.save(seller));
    }

    this.logger.log(`Seeded ${sellers.length} sellers.`);
    return sellers;
  }

  private async seedProducts(sellers: User[]): Promise<void> {
    const productsData = [
      {
        title: 'Carte Dracaufeu Edition 1',
        price: 1500,
        category: 'Cartes',
        condition: ProductCondition.VERY_GOOD,
      },
      {
        title: 'Figurine Goldorak Vintage',
        price: 300,
        category: 'Figurines',
        condition: ProductCondition.GOOD,
      },
      {
        title: 'Vinyle Pink Floyd Original',
        price: 120,
        category: 'Musique',
        condition: ProductCondition.USED,
      },
      {
        title: 'Bande Dessinée Tintin',
        price: 80,
        category: 'Livres',
        condition: ProductCondition.NEW,
      },
      {
        title: 'Montre Gousset Argent',
        price: 450,
        category: 'Horlogerie',
        condition: ProductCondition.VERY_GOOD,
      },
      {
        title: 'Appareil Photo Leica',
        price: 2500,
        category: 'Photographie',
        condition: ProductCondition.GOOD,
      },
      {
        title: "Pièce en or Louis d'Or",
        price: 350,
        category: 'Numismatique',
        condition: ProductCondition.VERY_GOOD,
      },
      {
        title: 'Jeu Vidéo Super Mario 64',
        price: 60,
        category: 'Jeux Vidéo',
        condition: ProductCondition.USED,
      },
      {
        title: 'Timbres Rares France',
        price: 200,
        category: 'Philatélie',
        condition: ProductCondition.NEW,
      },
      {
        title: 'Vase Ming Ancien',
        price: 5000,
        category: 'Antiquités',
        condition: ProductCondition.GOOD,
      },
    ];

    let i = 1;
    for (const data of productsData) {
      // Pick a random seller securely
      const seller = sellers[crypto.randomInt(0, sellers.length)];

      const product = this.productRepository.create({
        title: data.title,
        description: `Une magnifique pièce de collection : ${data.title}. Objet authentique et rare.`,
        price: data.price,
        category: data.category,
        condition: data.condition,
        image_url: `https://picsum.photos/seed/${i}/400/300`,
        seller: seller,
      });

      await this.productRepository.save(product);
      i++;
    }

    this.logger.log(`Seeded ${productsData.length} products.`);
  }
}
