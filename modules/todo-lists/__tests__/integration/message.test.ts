import { Express } from 'express';
import { Containers } from '@omniflex/core';
import { AutoServer } from '@omniflex/infra-express';

// Import route handlers
import './../../message.exposed.routes';
import './../../discussion.exposed.routes';
import './../../list.exposed.routes';
import './../../item.exposed.routes';

// Import test helpers
import { RequestHelper } from '../helpers/request';

import {
  createTestUser,
  createTestList,
  createTestItem,
  createTestDiscussion,
  expectResponseData,
} from '../helpers/setup';

describe('Message Management Integration Tests', () => {
  const sequelize = Containers.appContainer.resolve('sequelize');
  const expect200 = new RequestHelper(() => app, 200);
  const expect400 = new RequestHelper(() => app, 400);
  const expect401 = new RequestHelper(() => app, 401);
  const expect404 = new RequestHelper(() => app, 404);

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

  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /v1/todo-lists/discussions/:id/messages', () => {
    it('[MSG-C0010] should create a new message successfully', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await createTestDiscussion(item.id);

      const messageData = {
        content: 'Test Message',
      };

      const response = await expect200
        .post(`/v1/todo-lists/discussions/${discussion.id}/messages`, messageData, testUser.token);

      expectResponseData(response, {
        discussionId: discussion.id,
        content: messageData.content,
        senderId: testUser.id,
      });
    });

    it('[MSG-C0020] should require authentication', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await createTestDiscussion(item.id);

      const messageData = {
        content: 'Test Message',
      };

      await expect401
        .post(`/v1/todo-lists/discussions/${discussion.id}/messages`, messageData);
    });

    it('[MSG-C0030] should require valid discussion', async () => {
      const messageData = {
        content: 'Test Message',
      };

      await expect400
        .post('/v1/todo-lists/discussions/non-existent-id/messages', messageData, testUser.token);
    });

    it('[MSG-C0040] should require message content', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await createTestDiscussion(item.id);

      await expect400
        .post(`/v1/todo-lists/discussions/${discussion.id}/messages`, {}, testUser.token);
    });

    it('[MSG-C0050] should validate list membership', async () => {
      const otherUser = await createTestUser();
      const list = await createTestList(otherUser.id, 'Other List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await createTestDiscussion(item.id);

      const messageData = {
        content: 'Test Message',
      };

      await expect404
        .post(`/v1/todo-lists/discussions/${discussion.id}/messages`, messageData, testUser.token);
    });
  });
});