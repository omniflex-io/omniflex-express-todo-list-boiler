import request from 'supertest';
import { Express } from 'express';
import { Containers } from '@omniflex/core';
import { AutoServer } from '@omniflex/infra-express';

import { discussions, messages, invitations } from '../../todo.repo';

// Import route handlers
import './../../discussion.exposed.routes';
import './../../list.exposed.routes';
import './../../item.exposed.routes';

// Import test helpers
import { createTestUser, createTestList, createTestItem, createTestInvitation } from '../helpers/setup';

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

      const response = await request(app)
        .get(`/v1/todo-lists/${list.id}/items/${item.id}/discussion`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        itemId: item.id,
      });
    });

    it('[DSC-R0020] should create a new discussion for an item if it does not exist as member', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const invitation = await createTestInvitation(list.id, otherUser.id, testUser.id);
      await invitations.updateById(invitation.id, { status: 'accepted' });
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

    it('[DSC-R0030] should return existing discussion if it exists as owner', async () => {
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

    it('[DSC-R0040] should return existing discussion if it exists as member', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const invitation = await createTestInvitation(list.id, otherUser.id, testUser.id);
      await invitations.updateById(invitation.id, { status: 'accepted' });
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

    it('[DSC-R0050] should require authentication', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');

      await request(app)
        .get(`/v1/todo-lists/${list.id}/items/${item.id}/discussion`)
        .expect(401);
    });

    it('[DSC-R0060] should not reveal discussion existence to non-members', async () => {
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
    it('[DSC-R0070] should list all messages in a discussion as owner', async () => {
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

    it('[DSC-R0080] should list all messages in a discussion as member', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const invitation = await createTestInvitation(list.id, otherUser.id, testUser.id);
      await invitations.updateById(invitation.id, { status: 'accepted' });
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await discussions.create({ itemId: item.id });

      await messages.create({
        discussionId: discussion.id,
        senderId: otherUser.id,
        content: 'Test Message 1',
      });

      await messages.create({
        discussionId: discussion.id,
        senderId: otherUser.id,
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

    it('[DSC-R0090] should not reveal messages to non-members', async () => {
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

    it('[DSC-R0100] should require authentication', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      const discussion = await discussions.create({ itemId: item.id });

      await request(app)
        .get(`/v1/todo-lists/discussions/${discussion.id}/messages`)
        .expect(401);
    });
  });
});