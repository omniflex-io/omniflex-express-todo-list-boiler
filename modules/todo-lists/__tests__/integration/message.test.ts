import request from 'supertest';
import { Express } from 'express';
import { Containers } from '@omniflex/core';
import { AutoServer } from '@omniflex/infra-express';

// Import route handlers
import './../../message.exposed.routes';
import './../../discussion.exposed.routes';
import './../../list.exposed.routes';
import './../../item.exposed.routes';

// Import test helpers
import { createTestUser, createTestList, createTestItem, createTestDiscussion } from '../helpers/setup';

describe('Message Management Integration Tests', () => {
  const sequelize = Containers.appContainer.resolve('sequelize');

  let app: Express;
  let testUser: { id: string; token: string };

  beforeAll(async () => {
    if (!app) {
      app = (await AutoServer.start())
        .find(({ type }) => type === 'exposed')!
        .app;
    }

    testUser = await createTestUser();
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /v1/todo-lists/discussions/:id/messages', () => {
    it('should create a new message successfully', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await createTestDiscussion(item.id);

      const messageData = {
        content: 'Test Message',
      };

      const response = await request(app)
        .post(`/v1/todo-lists/discussions/${discussion.id}/messages`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(messageData)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        discussionId: discussion.id,
        content: messageData.content,
        senderId: testUser.id,
      });
    });

    it('should require authentication', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await createTestDiscussion(item.id);

      const messageData = {
        content: 'Test Message',
      };

      await request(app)
        .post(`/v1/todo-lists/discussions/${discussion.id}/messages`)
        .send(messageData)
        .expect(401);
    });

    it('should require valid discussion', async () => {
      const messageData = {
        content: 'Test Message',
      };

      await request(app)
        .post('/v1/todo-lists/discussions/non-existent-id/messages')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(messageData)
        .expect(400);
    });

    it('should require message content', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await createTestDiscussion(item.id);

      await request(app)
        .post(`/v1/todo-lists/discussions/${discussion.id}/messages`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({})
        .expect(400);
    });

    it('should validate list membership', async () => {
      const otherUser = await createTestUser();
      const list = await createTestList(otherUser.id, 'Other List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await createTestDiscussion(item.id);

      const messageData = {
        content: 'Test Message',
      };

      await request(app)
        .post(`/v1/todo-lists/discussions/${discussion.id}/messages`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(messageData)
        .expect(404);
    });
  });
});