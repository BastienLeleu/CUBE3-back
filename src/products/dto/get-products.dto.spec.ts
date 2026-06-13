import { validateSync } from 'class-validator';
import { GetProductsDto } from './get-products.dto';
import { ProductCondition } from '../entities/product.entity';

describe('GetProductsDto', () => {
  it('should validate with empty object since all fields are optional', () => {
    const dto = new GetProductsDto();
    const errors = validateSync(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate with correct types', () => {
    const dto = new GetProductsDto();
    dto.search = 'test';
    dto.category = 'games';
    dto.condition = ProductCondition.NEW;
    dto.minPrice = '10';
    dto.maxPrice = '100';

    const errors = validateSync(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation if minPrice is not a number string', () => {
    const dto = new GetProductsDto();
    dto.minPrice = 'abc';
    const errors = validateSync(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('minPrice');
  });

  it('should fail validation if maxPrice is not a number string', () => {
    const dto = new GetProductsDto();
    dto.maxPrice = 'abc';
    const errors = validateSync(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('maxPrice');
  });

  it('should fail validation if condition is not a valid enum', () => {
    const dto = new GetProductsDto();
    dto.condition = 'INVALID_CONDITION' as unknown as ProductCondition;
    const errors = validateSync(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('condition');
  });

  it('should fail validation if search is not a string', () => {
    const dto = new GetProductsDto();
    dto.search = 123 as unknown as string;
    const errors = validateSync(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('search');
  });

  it('should fail validation if minPrice > maxPrice', () => {
    const dto = new GetProductsDto();
    dto.minPrice = '100';
    dto.maxPrice = '50';
    const errors = validateSync(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('minPrice');
    expect(errors[0].constraints).toHaveProperty('isLessThanOrEqual');
  });
});
