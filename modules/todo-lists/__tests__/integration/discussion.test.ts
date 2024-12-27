import request from 'supertest';
import { Express } from 'express';
import { Containers } from '@omniflex/core';
import { AutoServer } from '@omniflex/infra-express';

import { discussions, messages } from '../../todo.repo';

// Import route handlers
import './../../discussion.exposed.routes';
import './../../list.exposed.routes';
import './../../item.exposed.routes';

// Import test helpers
import { createTestUser, createTestList, createTestItem } from '../helpers/setup';

describe('Discussion Management Integration Tests', () => {
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

  describe('GET /v1/todo-lists/:listId/items/:itemId/discussion', () => {
    it('should create a new discussion for an item if it does not exist', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');

      const response = await request(app)
        .get(`/v1/todo-lists/${list.id}/items/${item.id}/discussion`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        itemId: item.id,
      });
    });

    it('should return existing discussion if it exists', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await discussions.create({ itemId: item.id });

      const response = await request(app)
        .get(`/v1/todo-lists/${list.id}/items/${item.id}/discussion`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        id: discussion.id,
        itemId: item.id,
      });
    });

    it('should require authentication', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');

      await request(app)
        .get(`/v1/todo-lists/${list.id}/items/${item.id}/discussion`)
        .expect(401);
    });

    it('should not reveal discussion existence to non-members', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const item = await createTestItem(list.id, 'Test Item');
      await discussions.create({ itemId: item.id });

      await request(app)
        .get(`/v1/todo-lists/${list.id}/items/${item.id}/discussion`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(404);
    });
  });

  describe('GET /v1/todo-lists/discussions/:id/messages', () => {
    it('should list all messages in a discussion', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await discussions.create({ itemId: item.id });

      await messages.create({
        discussionId: discussion.id,
        senderId: testUser.id,
        content: 'Test Message 1',
      });

      await messages.create({
        discussionId: discussion.id,
        senderId: testUser.id,
        content: 'Test Message 2',
      });

      const response = await request(app)
        .get(`/v1/todo-lists/discussions/${discussion.id}/messages`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('content', 'Test Message 1');
      expect(response.body.data[1]).toHaveProperty('content', 'Test Message 2');
    });

    it('should not reveal messages to non-members', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await discussions.create({ itemId: item.id });

      await messages.create({
        discussionId: discussion.id,
        senderId: otherUser.id,
        content: 'Test Message',
      });

      await request(app)
        .get(`/v1/todo-lists/discussions/${discussion.id}/messages`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await discussions.create({ itemId: item.id });

      await request(app)
        .get(`/v1/todo-lists/discussions/${discussion.id}/messages`)
        .expect(401);
    });
  });
});