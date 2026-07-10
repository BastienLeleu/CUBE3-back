import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';

describe('CartService', () => {
  let service: CartService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dataSource: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let queryRunner: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let manager: Record<string, any>;

  beforeEach(async () => {
    manager = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      query: jest.fn(),
      manager,
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
      options: { type: 'postgres' }, // To test RLS branch
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('withRlsTransaction', () => {
    it('should set local variable if postgres and commit transaction', async () => {
      manager.find.mockResolvedValue([]);
      const result = await service.getCart('user1');

      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.query).toHaveBeenCalledWith(
        `SELECT set_config('app.current_user_id', $1, true)`,
        ['user1'],
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(result).toEqual({ items: [], total: 0 });
    });

    it('should not set local variable if not postgres', async () => {
      dataSource.options.type = 'better-sqlite3';
      manager.find.mockResolvedValue([]);
      await service.getCart('user1');

      expect(queryRunner.query).not.toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      manager.find.mockRejectedValue(new Error('DB error'));

      await expect(service.getCart('user1')).rejects.toThrow('DB error');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('addToCart', () => {
    it('should throw NotFoundException if product not found', async () => {
      manager.findOne.mockResolvedValue(null);
      await expect(
        service.addToCart('user1', { product_id: 'p1', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should add new item if not in cart', async () => {
      manager.findOne.mockResolvedValueOnce({
        id: 'p1',
        price: 100,
      } as Product); // product
      manager.findOne.mockResolvedValueOnce(null); // cart item not found

      const newCartItem = { user_id: 'user1', product_id: 'p1', quantity: 2 };
      manager.create.mockReturnValue(newCartItem);
      manager.find.mockImplementation(async () => [
        { ...newCartItem, product: { price: 100 } },
      ]);

      const result = await service.addToCart('user1', {
        product_id: 'p1',
        quantity: 2,
      });

      expect(manager.create).toHaveBeenCalledWith(CartItem, {
        user_id: 'user1',
        product_id: 'p1',
        quantity: 2,
      });
      expect(manager.save).toHaveBeenCalledWith(CartItem, newCartItem);
      expect(result.total).toBe(200);
    });

    it('should update quantity if item already in cart', async () => {
      manager.findOne.mockResolvedValueOnce({
        id: 'p1',
        price: 100,
      } as Product); // product
      const existingCartItem = {
        user_id: 'user1',
        product_id: 'p1',
        quantity: 1,
      };
      manager.findOne.mockResolvedValueOnce(existingCartItem); // cart item

      manager.find.mockImplementation(async () => [
        { ...existingCartItem, product: { price: 100 } },
      ]);

      const result = await service.addToCart('user1', {
        product_id: 'p1',
        quantity: 2,
      });

      expect(existingCartItem.quantity).toBe(3);
      expect(manager.save).toHaveBeenCalledWith(CartItem, existingCartItem);
      expect(result.total).toBe(300);
    });
  });

  describe('removeFromCart', () => {
    it('should throw NotFoundException if cart item not found', async () => {
      manager.findOne.mockResolvedValue(null);
      await expect(service.removeFromCart('user1', 'ci1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should remove item and return updated cart', async () => {
      const existingCartItem = { id: 'ci1', user_id: 'user1' };
      manager.findOne.mockResolvedValue(existingCartItem);
      manager.find.mockResolvedValue([]);

      const result = await service.removeFromCart('user1', 'ci1');

      expect(manager.remove).toHaveBeenCalledWith(CartItem, existingCartItem);
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});
