import { Express } from 'express';
import { Containers } from '@omniflex/core';
import { AutoServer } from '@omniflex/infra-express';

import { orders } from '../../order.repo';
import '../../order.staff.routes';

import { RequestHelper } from '../helpers/request';
import {
  createTestStaff,
  createTestProduct,
  createTestShoppingCart,
  createTestOrder,
  createTestOrderItem,
  resetTestData,
  expectResponseData,
  expectListResponse,
} from '../helpers/setup';

describe('Order Staff Routes Integration Tests', () => {
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

  describe('GET /v1/order-management/orders', () => {
    it('[ORD-R0010] should list all orders', async () => {
      const cart1 = await createTestShoppingCart('checkout');
      const cart2 = await createTestShoppingCart('checkout');
      const order1 = await createTestOrder(cart1.id);
      const order2 = await createTestOrder(cart2.id);

      const response = await expect200
        .get('/v1/order-management/orders', staff.token);

      expectListResponse(response, 2, [
        { id: order1.id, shoppingCartId: cart1.id },
        { id: order2.id, shoppingCartId: cart2.id },
      ]);
    });

    it('[ORD-R0020] should filter orders by shopping cart', async () => {
      const cart = await createTestShoppingCart('checkout');
      const order = await createTestOrder(cart.id);
      await createTestOrder((await createTestShoppingCart('checkout')).id);

      const response = await expect200
        .get(`/v1/order-management/orders?shoppingCartId=${cart.id}`, staff.token);

      expectListResponse(response, 1, [
        { id: order.id, shoppingCartId: cart.id },
      ]);
    });

    it('[ORD-R0030] should require authentication', async () => {
      await expect401.get('/v1/order-management/orders');
    });
  });

  describe('POST /v1/order-management/orders', () => {
    it('[ORD-C0010] should create a new order', async () => {
      const cart = await createTestShoppingCart('checkout');
      const orderData = {
        shoppingCartId: cart.id,
      };

      const response = await expect200
        .post('/v1/order-management/orders', orderData, staff.token);

      expectResponseData(response, {
        shoppingCartId: cart.id,
      });
    });

    it('[ORD-C0020] should require authentication', async () => {
      const cart = await createTestShoppingCart('checkout');
      const orderData = {
        shoppingCartId: cart.id,
      };

      await expect401
        .post('/v1/order-management/orders', orderData);
    });

    it('[ORD-C0030] should validate required fields', async () => {
      const invalidData = {};

      await expect400
        .post('/v1/order-management/orders', invalidData, staff.token);
    });
  });

  describe('GET /v1/order-management/shopping-carts', () => {
    it('[CART-R0010] should list all shopping carts', async () => {
      const cart1 = await createTestShoppingCart('active');
      const cart2 = await createTestShoppingCart('checkout');

      const response = await expect200
        .get('/v1/order-management/shopping-carts', staff.token);

      expectListResponse(response, 2, [
        { id: cart1.id, status: 'active' },
        { id: cart2.id, status: 'checkout' },
      ]);
    });

    it('[CART-R0020] should filter shopping carts by status', async () => {
      const cart = await createTestShoppingCart('active');
      await createTestShoppingCart('checkout');

      const response = await expect200
        .get('/v1/order-management/shopping-carts?status=active', staff.token);

      expectListResponse(response, 1, [
        { id: cart.id, status: 'active' },
      ]);
    });

    it('[CART-R0030] should require authentication', async () => {
      await expect401.get('/v1/order-management/shopping-carts');
    });
  });

  describe('PATCH /v1/order-management/shopping-carts/:cartId', () => {
    it('[CART-U0010] should update shopping cart status', async () => {
      const cart = await createTestShoppingCart('active');
      const updateData = {
        status: 'checkout',
      };

      const response = await expect200
        .patch(`/v1/order-management/shopping-carts/${cart.id}`, updateData, staff.token);

      expectResponseData(response, {
        id: cart.id,
        status: updateData.status,
      });
    });

    it('[CART-U0020] should require authentication', async () => {
      const cart = await createTestShoppingCart('active');
      const updateData = {
        status: 'checkout',
      };

      await expect401
        .patch(`/v1/order-management/shopping-carts/${cart.id}`, updateData);
    });

    it('[CART-U0030] should validate status value', async () => {
      const cart = await createTestShoppingCart('active');
      const invalidData = {
        status: 'invalid-status',
      };

      await expect400
        .patch(`/v1/order-management/shopping-carts/${cart.id}`, invalidData, staff.token);
    });
  });
}); 