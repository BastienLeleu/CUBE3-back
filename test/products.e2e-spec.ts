import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('ProductsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/products (GET) with valid parameters should return 200', () => {
    return request(app.getHttpServer())
      .get('/products?minPrice=10&maxPrice=100&condition=NEW')
      .expect(200);
  });

  it('/products (GET) with invalid minPrice should return 400', () => {
    return request(app.getHttpServer())
      .get('/products?minPrice=abc')
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toEqual(
          expect.arrayContaining(['minPrice must be a number string']),
        );
      });
  });

  it('/products (GET) with invalid condition should return 400', () => {
    return request(app.getHttpServer())
      .get('/products?condition=INVALID')
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toEqual('Bad Request');
      });
  });

  it('/products (GET) with minPrice > maxPrice should return 400', () => {
    return request(app.getHttpServer())
      .get('/products?minPrice=100&maxPrice=50')
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toEqual(
          expect.arrayContaining([
            'minPrice must be less than or equal to maxPrice',
          ]),
        );
      });
  });
});
