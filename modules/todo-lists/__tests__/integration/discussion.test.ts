import { Express } from 'express';
import { Containers } from '@omniflex/core';
import { AutoServer } from '@omniflex/infra-express';

import { discussions, messages, invitations } from '../../todo.repo';

// Import route handlers
import './../../discussion.exposed.routes';
import './../../list.exposed.routes';
import './../../item.exposed.routes';

// Import test helpers
import { RequestHelper } from '../helpers/request';

import {
  createTestUser,
  createTestList,
  createTestItem,
  createTestInvitation,
  expectResponseData,
  expectListResponse,
} from '../helpers/setup';

describe('Discussion Management Integration Tests', () => {
  const sequelize = Containers.appContainer.resolve('sequelize');
  const expect200 = new RequestHelper(() => app, 200);
  const expect401 = new RequestHelper(() => app, 401);
  const expect404 = new RequestHelper(() => app, 404);

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

  beforeEach(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /v1/todo-lists/:listId/items/:itemId/discussion', () => {
    it('[DSC-R0010] should create a new discussion for an item if it does not exist as owner', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');

      const response = await expect200
        .get(`/v1/todo-lists/${list.id}/items/${item.id}/discussion`, testUser.token);

      expectResponseData(response, { itemId: item.id });
    });

    it('[DSC-R0020] should create a new discussion for an item if it does not exist as member', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const invitation = await createTestInvitation(list.id, otherUser.id, testUser.id);
      await invitations.updateById(invitation.id, { status: 'accepted' });
      const item = await createTestItem(list.id, 'Test Item');

      const response = await expect200
        .get(`/v1/todo-lists/${list.id}/items/${item.id}/discussion`, testUser.token);

      expectResponseData(response, { itemId: item.id });
    });

    it('[DSC-R0030] should return existing discussion if it exists as owner', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await discussions.create({ itemId: item.id });

      const response = await expect200
        .get(`/v1/todo-lists/${list.id}/items/${item.id}/discussion`, testUser.token);

      expectResponseData(response, {
        id: discussion.id,
        itemId: item.id,
      });
    });

    it('[DSC-R0040] should return existing discussion if it exists as member', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const invitation = await createTestInvitation(list.id, otherUser.id, testUser.id);
      await invitations.updateById(invitation.id, { status: 'accepted' });
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await discussions.create({ itemId: item.id });

      const response = await expect200
        .get(`/v1/todo-lists/${list.id}/items/${item.id}/discussion`, testUser.token);

      expectResponseData(response, {
        id: discussion.id,
        itemId: item.id,
      });
    });

    it('[DSC-R0050] should require authentication', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');

      await expect401
        .get(`/v1/todo-lists/${list.id}/items/${item.id}/discussion`);
    });

    it('[DSC-R0060] should not reveal discussion existence to non-members', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const item = await createTestItem(list.id, 'Test Item');
      await discussions.create({ itemId: item.id });

      await expect404
        .get(`/v1/todo-lists/${list.id}/items/${item.id}/discussion`, testUser.token);
    });
  });

  describe('GET /v1/todo-lists/discussions/:id/messages', () => {
    it('[DSC-R0070] should list all messages in a discussion as owner', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await discussions.create({ itemId: item.id });

      const message1 = await messages.create({
        discussionId: discussion.id,
        senderId: testUser.id,
        content: 'Test Message 1',
      });

      const message2 = await messages.create({
        discussionId: discussion.id,
        senderId: testUser.id,
        content: 'Test Message 2',
      });

      const response = await expect200
        .get(`/v1/todo-lists/discussions/${discussion.id}/messages`, testUser.token);

      expectListResponse(response, 2, [
        { id: message1.id, content: 'Test Message 1' },
        { id: message2.id, content: 'Test Message 2' },
      ]);
    });

    it('[DSC-R0080] should list all messages in a discussion as member', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const invitation = await createTestInvitation(list.id, otherUser.id, testUser.id);
      await invitations.updateById(invitation.id, { status: 'accepted' });
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await discussions.create({ itemId: item.id });

      const message1 = await messages.create({
        discussionId: discussion.id,
        senderId: otherUser.id,
        content: 'Test Message 1',
      });

      const message2 = await messages.create({
        discussionId: discussion.id,
        senderId: otherUser.id,
        content: 'Test Message 2',
      });

      const response = await expect200
        .get(`/v1/todo-lists/discussions/${discussion.id}/messages`, testUser.token);

      expectListResponse(response, 2, [
        { id: message1.id, content: 'Test Message 1' },
        { id: message2.id, content: 'Test Message 2' },
      ]);
    });

    it('[DSC-R0090] should not reveal messages to non-members', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await discussions.create({ itemId: item.id });

      await messages.create({
        discussionId: discussion.id,
        senderId: otherUser.id,
        content: 'Test Message',
      });

      await expect404
        .get(`/v1/todo-lists/discussions/${discussion.id}/messages`, testUser.token);
    });

    it('[DSC-R0100] should require authentication', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await discussions.create({ itemId: item.id });

      await expect401
        .get(`/v1/todo-lists/discussions/${discussion.id}/messages`);
    });
  });
});