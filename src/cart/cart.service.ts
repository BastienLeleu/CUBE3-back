import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CartItem } from './entities/cart-item.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { Product } from '../products/entities/product.entity';

export interface CartResponse {
  items: CartItem[];
  total: number;
}

@Injectable()
export class CartService {
  constructor(private readonly dataSource: DataSource) {}

  private async withRlsTransaction<T>(
    userId: string,
    operation: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (this.dataSource.options.type === 'postgres') {
        await queryRunner.query(`SET LOCAL app.current_user_id = '${userId}';`);
      }

      const result = await operation(queryRunner.manager);

      await queryRunner.commitTransaction();
      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getCart(userId: string): Promise<CartResponse> {
    console.log('GET CART FOR USER:', userId);
    return this.withRlsTransaction(userId, async (manager) => {
      const items = await manager.find(CartItem, {
        where: { user_id: userId },
        relations: { product: true },
      });
      console.log('GET CART ITEMS DB:', items.length);

      const total = items.reduce(
        (sum: number, item: CartItem) =>
          sum + (item.product?.price || 0) * item.quantity,
        0,
      );

      return {
        items,
        total,
      };
    });
  }

  async addToCart(userId: string, dto: AddToCartDto): Promise<CartResponse> {
    await this.withRlsTransaction(userId, async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id: dto.product_id },
      });

      if (!product) {
        throw new NotFoundException('Produit introuvable');
      }

      let cartItem = await manager.findOne(CartItem, {
        where: { user_id: userId, product_id: dto.product_id },
      });

      if (cartItem) {
        cartItem.quantity += dto.quantity;
      } else {
        cartItem = manager.create(CartItem, {
          user_id: userId,
          product_id: dto.product_id,
          quantity: dto.quantity,
        });
      }

      await manager.save(CartItem, cartItem);
    });
    return this.getCart(userId);
  }

  async removeFromCart(
    userId: string,
    cartItemId: string,
  ): Promise<CartResponse> {
    await this.withRlsTransaction(userId, async (manager) => {
      const cartItem = await manager.findOne(CartItem, {
        where: { id: cartItemId, user_id: userId },
      });

      if (!cartItem) {
        throw new NotFoundException('Article introuvable dans le panier');
      }

      await manager.remove(CartItem, cartItem);
    });
    return this.getCart(userId);
  }
}
