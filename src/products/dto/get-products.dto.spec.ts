import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
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

  describe('Pagination fields (page, limit)', () => {
    it('should assign default values and validate successfully when undefined', () => {
      const dto = plainToInstance(GetProductsDto, {});
      const errors = validateSync(dto);
      expect(errors.length).toBe(0);
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(20);
    });

    it('should validate and transform valid numeric string inputs', () => {
      const dto = plainToInstance(GetProductsDto, { page: '2', limit: '50' });
      const errors = validateSync(dto);
      expect(errors.length).toBe(0);
      expect(dto.page).toBe(2);
      expect(dto.limit).toBe(50);
    });

    it('should fail validation if page is a non-numeric string', () => {
      const dto = plainToInstance(GetProductsDto, { page: 'abc' });
      const errors = validateSync(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('page');
    });

    it('should fail validation if limit is a non-numeric string', () => {
      const dto = plainToInstance(GetProductsDto, { limit: 'abc' });
      const errors = validateSync(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('limit');
    });

    it('should fail validation for out-of-range values (page < 1)', () => {
      const dto = plainToInstance(GetProductsDto, { page: 0 });
      const errors = validateSync(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('page');
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should fail validation for out-of-range values (limit < 1)', () => {
      const dto = plainToInstance(GetProductsDto, { limit: 0 });
      const errors = validateSync(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('limit');
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should fail validation for out-of-range values (limit > max)', () => {
      const dto = plainToInstance(GetProductsDto, { limit: 101 });
      const errors = validateSync(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('limit');
      expect(errors[0].constraints).toHaveProperty('max');
    });

    it('should validate successfully for boundary cases (page=1, limit=100)', () => {
      const dto = plainToInstance(GetProductsDto, { page: 1, limit: 100 });
      const errors = validateSync(dto);
      expect(errors.length).toBe(0);
    });
  });
});
