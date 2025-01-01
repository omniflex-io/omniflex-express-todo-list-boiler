import { Express } from 'express';
import { Containers } from '@omniflex/core';
import { AutoServer } from '@omniflex/infra-express';

import { products } from '../../order.repo';
import '../../product.staff.routes';

import { RequestHelper } from '../helpers/request';
import {
  createTestStaff,
  createTestProduct,
  resetTestData,
  expectResponseData,
  expectListResponse,
} from '../helpers/setup';

describe('Product Staff Routes Integration Tests', () => {
  const sequelize = Containers.appContainer.resolve('sequelize');
  const expect200 = new RequestHelper(() => app, 200);
  const expect401 = new RequestHelper(() => app, 401);
  const expect400 = new RequestHelper(() => app, 400);

  let app: Express;
  let staff: { id: string; token: string; };

  beforeAll(async () => {
    if (!app) {
      app = (await AutoServer.start())
        .find(({ type }) => type === 'staff')!
        .app;
    }

    staff = await createTestStaff();
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await resetTestData();
  });

  describe('GET /v1/order-management/products', () => {
    it('[PROD-R0010] should list all products', async () => {
      const product1 = await createTestProduct('Product 1', 99.99);
      const product2 = await createTestProduct('Product 2', 149.99);

      const response = await expect200
        .get('/v1/order-management/products', staff.token);

      expectListResponse(response, 2, [
        { id: product1.id, name: product1.name, price: product1.price },
        { id: product2.id, name: product2.name, price: product2.price },
      ]);
    });

    it('[PROD-R0020] should filter products by name', async () => {
      const product1 = await createTestProduct('Test Product', 99.99);
      await createTestProduct('Other Product', 149.99);

      const response = await expect200
        .get('/v1/order-management/products?name=Test', staff.token);

      expectListResponse(response, 1, [
        { id: product1.id, name: product1.name, price: product1.price },
      ]);
    });

    it('[PROD-R0030] should require authentication', async () => {
      await expect401.get('/v1/order-management/products');
    });
  });

  describe('POST /v1/order-management/products', () => {
    it('[PROD-C0010] should create a new product', async () => {
      const productData = {
        name: 'New Product',
        price: 199.99,
      };

      const response = await expect200
        .post('/v1/order-management/products', productData, staff.token);

      expectResponseData(response, {
        name: productData.name,
        price: productData.price,
      });
    });

    it('[PROD-C0020] should require authentication', async () => {
      const productData = {
        name: 'New Product',
        price: 199.99,
      };

      await expect401
        .post('/v1/order-management/products', productData);
    });

    it('[PROD-C0030] should validate required fields', async () => {
      const invalidData = {
        price: 199.99,
      };

      await expect400
        .post('/v1/order-management/products', invalidData, staff.token);
    });

    it('[PROD-C0040] should validate price is positive', async () => {
      const invalidData = {
        name: 'Invalid Product',
        price: -10,
      };

      await expect400
        .post('/v1/order-management/products', invalidData, staff.token);
    });
  });

  describe('PATCH /v1/order-management/products/:productId', () => {
    it('[PROD-U0010] should update a product', async () => {
      const product = await createTestProduct('Original Product', 99.99);
      const updateData = {
        name: 'Updated Product',
        price: 149.99,
      };

      const response = await expect200
        .patch(`/v1/order-management/products/${product.id}`, updateData, staff.token);

      expectResponseData(response, {
        id: product.id,
        ...updateData,
      });
    });

    it('[PROD-U0020] should allow partial updates', async () => {
      const product = await createTestProduct('Original Product', 99.99);
      const updateData = {
        name: 'Updated Product',
      };

      const response = await expect200
        .patch(`/v1/order-management/products/${product.id}`, updateData, staff.token);

      expectResponseData(response, {
        id: product.id,
        name: updateData.name,
        price: product.price,
      });
    });

    it('[PROD-U0030] should require authentication', async () => {
      const product = await createTestProduct('Test Product', 99.99);
      const updateData = {
        name: 'Updated Product',
      };

      await expect401
        .patch(`/v1/order-management/products/${product.id}`, updateData);
    });

    it('[PROD-U0040] should validate price is positive when provided', async () => {
      const product = await createTestProduct('Test Product', 99.99);
      const invalidData = {
        price: -10,
      };

      await expect400
        .patch(`/v1/order-management/products/${product.id}`, invalidData, staff.token);
    });
  });
}); 