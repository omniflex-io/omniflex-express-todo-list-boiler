import request from 'supertest';
import { Express } from 'express';
import { Containers } from '@omniflex/core';
import { AutoServer } from '@omniflex/infra-express';

import { items, invitations } from '../../todo.repo';

// Import route handlers
import './../../item.exposed.routes';
import './../../list.exposed.routes';

// Import test helpers
import { createTestUser, createTestList, createTestItem } from '../helpers/setup';

describe('Item Management Integration Tests', () => {
  const sequelize = Containers.appContainer.resolve('sequelize');

  let app: Express;
  let testUser: { id: string; token: string };
  let otherUser: { id: string; token: string };

  beforeAll(async () => {
    if (!app) {
      app = (await AutoServer.start())
        .find(({ type }) => type === 'exposed')!
        .app;
    }

    testUser = await createTestUser();
    otherUser = await createTestUser();
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  describe('POST /v1/todo-lists/:listId/items', () => {
    it('should create a new item successfully as owner', async () => {
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

    it('should create a new item successfully as member', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      await invitations.create({
        listId: list.id,
        inviterId: otherUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
        approved: true,
      });

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
    it('should list all items in a list as owner', async () => {
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

    it('should list all items in a list as member', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      await invitations.create({
        listId: list.id,
        inviterId: otherUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
        approved: true,
      });
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

    it('should not reveal items to non-members', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      await createTestItem(list.id, 'Test Item 1');
      await createTestItem(list.id, 'Test Item 2');

      await request(app)
        .get(`/v1/todo-lists/${list.id}/items`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(404);
    });
  });

  describe('GET /v1/todo-lists/:listId/items/:id', () => {
    it('should get a specific item as owner', async () => {
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

    it('should get a specific item as member', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      await invitations.create({
        listId: list.id,
        inviterId: otherUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
        approved: true,
      });
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

    it('should not reveal item existence to non-members', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const item = await createTestItem(list.id, 'Test Item');

      await request(app)
        .get(`/v1/todo-lists/${list.id}/items/${item.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(404);
    });
  });

  describe('PATCH /v1/todo-lists/:listId/items/:id', () => {
    it('should update item content as owner', async () => {
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

    it('should update item content as member', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      await invitations.create({
        listId: list.id,
        inviterId: otherUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
        approved: true,
      });
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

    it('should not allow non-members to update items', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const item = await createTestItem(list.id, 'Test Item');

      await request(app)
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ content: 'Updated Item' })
        .expect(404);
    });
  });

  describe('PATCH /v1/todo-lists/:listId/items/:id/complete', () => {
    it('should mark item as completed as owner', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');

      const response = await request(app)
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}/complete`)
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

    it('should mark item as completed as member', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      await invitations.create({
        listId: list.id,
        inviterId: otherUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
        approved: true,
      });
      const item = await createTestItem(list.id, 'Test Item');

      const response = await request(app)
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}/complete`)
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

    it('should not allow non-members to complete items', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const item = await createTestItem(list.id, 'Test Item');

      await request(app)
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}/complete`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(404);
    });
  });

  describe('PATCH /v1/todo-lists/:listId/items/:id/uncomplete', () => {
    it('should mark item as uncompleted as owner', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      await items.updateById(item.id, {
        isCompleted: true,
        completedAt: new Date(),
        completedBy: testUser.id,
      });

      const response = await request(app)
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}/uncomplete`)
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

    it('should mark item as uncompleted as member', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      await invitations.create({
        listId: list.id,
        inviterId: otherUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
        approved: true,
      });
      const item = await createTestItem(list.id, 'Test Item');
      await items.updateById(item.id, {
        isCompleted: true,
        completedAt: new Date(),
        completedBy: otherUser.id,
      });

      const response = await request(app)
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}/uncomplete`)
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

    it('should not allow non-members to uncomplete items', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const item = await createTestItem(list.id, 'Test Item');
      await items.updateById(item.id, {
        isCompleted: true,
        completedAt: new Date(),
        completedBy: otherUser.id,
      });

      await request(app)
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}/uncomplete`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(404);
    });
  });
});