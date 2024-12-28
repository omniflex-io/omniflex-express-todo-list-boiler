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
  createTestInvitation,
  expectResponseData,
} from '../helpers/setup';

import { invitations } from '../../todo.repo';

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
    it('[MSG-C0010] should create a new message successfully as owner', async () => {
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

    it('[MSG-C0011] should create a new message successfully as approved member', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await createTestDiscussion(item.id);
      const member = await createTestUser();
      const invitation = await createTestInvitation(list.id, testUser.id, member.id);
      await invitations.updateById(invitation.id, { status: 'accepted', approved: true });

      const messageData = {
        content: 'Test Message from Member',
      };

      const response = await expect200
        .post(`/v1/todo-lists/discussions/${discussion.id}/messages`, messageData, member.token);

      expectResponseData(response, {
        discussionId: discussion.id,
        content: messageData.content,
        senderId: member.id,
      });
    });

    it('[MSG-C0012] should not allow unapproved member to create message', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await createTestDiscussion(item.id);
      const member = await createTestUser();
      const invitation = await createTestInvitation(list.id, testUser.id, member.id);
      await invitations.updateById(invitation.id, { status: 'accepted', approved: false });

      const messageData = {
        content: 'Test Message from Unapproved Member',
      };

      await expect404
        .post(`/v1/todo-lists/discussions/${discussion.id}/messages`, messageData, member.token);
    });

    it('[MSG-C0013] should not allow pending member to create message', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await createTestDiscussion(item.id);
      const member = await createTestUser();
      await createTestInvitation(list.id, testUser.id, member.id);

      const messageData = {
        content: 'Test Message from Pending Member',
      };

      await expect404
        .post(`/v1/todo-lists/discussions/${discussion.id}/messages`, messageData, member.token);
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

    it('[MSG-C0050] should not allow non-member to create message', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await createTestDiscussion(item.id);
      const nonMember = await createTestUser();

      const messageData = {
        content: 'Test Message from Non-Member',
      };

      await expect404
        .post(`/v1/todo-lists/discussions/${discussion.id}/messages`, messageData, nonMember.token);
    });
  });
});