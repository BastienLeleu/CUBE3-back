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
    app.getHttpAdapter().getInstance().set('trust proxy', true);
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

  it('/products (GET) should return 429 when throttled', async () => {
    const limit = 300; // The limit set in ProductsController route

    // Perform N allowed requests
    const promises = [];
    for (let i = 0; i < limit; i++) {
      promises.push(
        request(app.getHttpServer())
          .get('/products')
          .set('X-Forwarded-For', '192.168.1.100')
          .expect(200),
      );
    }
    await Promise.all(promises);

    // The N+1 request should fail with 429
    await request(app.getHttpServer())
      .get('/products')
      .set('X-Forwarded-For', '192.168.1.100')
      .expect(429)
      .expect((res) => {
        expect(res.body.statusCode).toEqual(429);
        expect(res.body.message).toMatch(/ThrottlerException/i);
      });
  });
});
