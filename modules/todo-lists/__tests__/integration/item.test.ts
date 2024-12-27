import request from 'supertest';
import { Express } from 'express';
import { Server } from 'http';
import { Containers } from '@omniflex/core';
import { AutoServer } from '@omniflex/infra-express';

import { items } from '../../todo.repo';

// Import route handlers
import './../../item.exposed.routes';
import './../../list.exposed.routes';

// Import test helpers
import { createTestUser, createTestList, createTestItem } from '../helpers/setup';

describe('Item Management Integration Tests', () => {
  const sequelize = Containers.appContainer.resolve('sequelize');

  let app: Express;
  let servers: Server[];
  let testUser: { id: string; token: string };
  let otherUser: { id: string; token: string };

  beforeAll(async () => {
    const _servers = await AutoServer.start();
    const exposedServer = _servers.find(({ type }) => type === 'exposed')!;

    app = exposedServer.app;
    servers = _servers.map(({ server }) => server!).filter(Boolean);

    testUser = await createTestUser();
    otherUser = await createTestUser();
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await Promise.all(
      servers.map(server => new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      })),
    );
    await sequelize.close();
  });

  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  describe('POST /v1/todo-lists/:listId/items', () => {
    it('should create a new item successfully', async () => {
      const list = await createTestList(testUser.id, 'Test List');

      const response = await request(app)
        .post(`/v1/todo-lists/${list.id}/items`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ content: 'Test Item' })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        listId: list.id,
        content: 'Test Item',
        isCompleted: false,
      });
    });

    it('should require list access', async () => {
      const list = await createTestList(testUser.id, 'Test List');

      await request(app)
        .post(`/v1/todo-lists/${list.id}/items`)
        .set('Authorization', `Bearer ${otherUser.token}`)
        .send({ content: 'Test Item' })
        .expect(404);
    });
  });

  describe('GET /v1/todo-lists/:listId/items', () => {
    it('should list all items in a list', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      await createTestItem(list.id, 'Test Item 1');
      await createTestItem(list.id, 'Test Item 2');

      const response = await request(app)
        .get(`/v1/todo-lists/${list.id}/items`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('content', 'Test Item 1');
      expect(response.body.data[1]).toHaveProperty('content', 'Test Item 2');
    });
  });

  describe('GET /v1/todo-lists/:listId/items/:id', () => {
    it('should get a specific item', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');

      const response = await request(app)
        .get(`/v1/todo-lists/${list.id}/items/${item.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        id: item.id,
        listId: list.id,
        content: 'Test Item',
        isCompleted: false,
      });
    });
  });

  describe('PATCH /v1/todo-lists/:listId/items/:id', () => {
    it('should update item content', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');

      const response = await request(app)
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ content: 'Updated Item' })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        id: item.id,
        listId: list.id,
        content: 'Updated Item',
      });
    });
  });

  describe('POST /v1/todo-lists/:listId/items/:id/complete', () => {
    it('should mark item as completed', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');

      const response = await request(app)
        .post(`/v1/todo-lists/${list.id}/items/${item.id}/complete`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        id: item.id,
        listId: list.id,
        isCompleted: true,
        completedBy: testUser.id,
      });
      expect(response.body.data).toHaveProperty('completedAt');
    });
  });

  describe('POST /v1/todo-lists/:listId/items/:id/uncomplete', () => {
    it('should mark item as uncompleted', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      await items.updateById(item.id, {
        isCompleted: true,
        completedAt: new Date(),
        completedBy: testUser.id,
      });

      const response = await request(app)
        .post(`/v1/todo-lists/${list.id}/items/${item.id}/uncomplete`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        id: item.id,
        listId: list.id,
        isCompleted: false,
      });
      expect(response.body.data.completedAt).toBeFalsy();
      expect(response.body.data.completedBy).toBeFalsy();
    });
  });
});