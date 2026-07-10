import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';

describe('CartController', () => {
  let controller: CartController;
  let cartService: Record<string, jest.Mock>;

  beforeEach(async () => {
    cartService = {
      getCart: jest.fn(),
      addToCart: jest.fn(),
      removeFromCart: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: cartService,
        },
      ],
    }).compile();

    controller = module.get<CartController>(CartController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get cart', async () => {
    const req = { user: { id: 'user1' } };
    const mockCart = { items: [], total: 0 };
    cartService.getCart.mockResolvedValue(mockCart);

    const result = await controller.getCart(req);
    expect(result).toEqual(mockCart);
    expect(cartService.getCart).toHaveBeenCalledWith('user1');
  });

  it('should add to cart', async () => {
    const req = { user: { id: 'user1' } };
    const dto: AddToCartDto = { product_id: 'prod1', quantity: 2 };
    const mockCart = { items: [{ id: '1' }], total: 10 };
    cartService.addToCart.mockResolvedValue(mockCart);

    const result = await controller.addToCart(req, dto);
    expect(result).toEqual(mockCart);
    expect(cartService.addToCart).toHaveBeenCalledWith('user1', dto);
  });

  it('should remove from cart', async () => {
    const req = { user: { id: 'user1' } };
    const mockCart = { items: [], total: 0 };
    cartService.removeFromCart.mockResolvedValue(mockCart);

    const result = await controller.removeFromCart(req, 'item1');
    expect(result).toEqual(mockCart);
    expect(cartService.removeFromCart).toHaveBeenCalledWith('user1', 'item1');
  });
});
