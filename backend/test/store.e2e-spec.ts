import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Store API (e2e)', () => {
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

  describe('GET /api/v1/store/menu', () => {
    it('returns categories with products', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/menu')
        .expect(200);

      expect(res.body).toHaveProperty('categories');
      expect(Array.isArray(res.body.categories)).toBe(true);
      expect(res.body.categories.length).toBeGreaterThan(0);

      const cat = res.body.categories[0];
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('name');
      expect(cat).toHaveProperty('products');
      expect(Array.isArray(cat.products)).toBe(true);
    });

    it('includes Stone Fungus category with pizzas', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/menu')
        .expect(200);

      const sf = res.body.categories.find(
        (c: { name: string }) => c.name === 'Stone Fungus',
      );
      expect(sf).toBeDefined();
      expect(sf.products.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/store/products/:id/extras', () => {
    it('returns an array (even if empty)', async () => {
      const menuRes = await request(app.getHttpServer())
        .get('/api/v1/store/menu')
        .expect(200);

      const firstProduct = menuRes.body.categories[0]?.products[0];
      if (!firstProduct) return;

      const res = await request(app.getHttpServer())
        .get(`/api/v1/store/products/${firstProduct.id}/extras`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/v1/store/quote', () => {
    it('returns totalAmount and lines for valid items', async () => {
      const menuRes = await request(app.getHttpServer())
        .get('/api/v1/store/menu')
        .expect(200);

      const product = menuRes.body.categories[0]?.products[0];
      if (!product) return;

      const res = await request(app.getHttpServer())
        .post('/api/v1/store/quote')
        .send({ items: [{ productId: product.id, quantity: 2, extras: [] }] })
        .expect(201);

      expect(res.body).toHaveProperty('totalAmount');
      expect(res.body).toHaveProperty('lines');
      expect(res.body.lines).toHaveLength(1);
      expect(res.body.lines[0].productId).toBe(product.id);
      expect(res.body.lines[0].quantity).toBe(2);
      expect(res.body.totalAmount).toBe(
        res.body.lines[0].unitPrice * res.body.lines[0].quantity,
      );
    });
  });

  describe('POST /api/v1/store/orders', () => {
    it('creates order and returns id', async () => {
      const menuRes = await request(app.getHttpServer())
        .get('/api/v1/store/menu')
        .expect(200);

      const product = menuRes.body.categories[0]?.products[0];
      if (!product) return;

      const res = await request(app.getHttpServer())
        .post('/api/v1/store/orders')
        .send({
          items: [{ productId: product.id, quantity: 1 }],
          customer: {
            name: 'E2E Test',
            phone: '912345678',
            address: 'Calle Test 100',
          },
          paymentMethod: 'transfer',
          storeBrand: 'sf',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(typeof res.body.id).toBe('number');
    });
  });

  describe('GET /api/v1/store/orders/:id/status', () => {
    it('returns timeline and lineItems for existing order', async () => {
      const menuRes = await request(app.getHttpServer())
        .get('/api/v1/store/menu')
        .expect(200);

      const product = menuRes.body.categories[0]?.products[0];
      if (!product) return;

      const orderRes = await request(app.getHttpServer())
        .post('/api/v1/store/orders')
        .send({
          items: [{ productId: product.id, quantity: 1 }],
          customer: { name: 'Status Test', phone: '987654321', address: 'Av E2E 99' },
          paymentMethod: 'transfer',
          storeBrand: 'sf',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/store/orders/${orderRes.body.id}/status`)
        .expect(200);

      expect(res.body).toHaveProperty('id', orderRes.body.id);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('kitchenStatus');
      expect(res.body).toHaveProperty('paymentLabel');
      expect(res.body).toHaveProperty('kitchenLabel');
      expect(res.body).toHaveProperty('timeline');
      expect(Array.isArray(res.body.timeline)).toBe(true);
      expect(res.body.timeline.length).toBeGreaterThanOrEqual(3);
      expect(res.body).toHaveProperty('lineItems');
      expect(res.body.lineItems.length).toBeGreaterThanOrEqual(1);
      expect(res.body).not.toHaveProperty('note');
    });
  });
});
