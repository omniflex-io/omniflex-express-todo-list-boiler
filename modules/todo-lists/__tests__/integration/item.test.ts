import { Express } from 'express';
import { Containers } from '@omniflex/core';
import { AutoServer } from '@omniflex/infra-express';

import { items, invitations, lists } from '../../todo.repo';

// Import route handlers
import './../../item.exposed.routes';
import './../../list.exposed.routes';

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

describe('Item Management Integration Tests', () => {
  const sequelize = Containers.appContainer.resolve('sequelize');
  const expect200 = new RequestHelper(() => app, 200);
  const expect404 = new RequestHelper(() => app, 404);

  let app: Express;
  let testUser: { id: string; token: string; };
  let otherUser: { id: string; token: string; };

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
    it('[ITM-C0010] should create a new item successfully as owner', async () => {
      const list = await createTestList(testUser.id, 'Test List');

      const response = await expect200
        .post(`/v1/todo-lists/${list.id}/items`, { content: 'Test Item' }, testUser.token);

      expectResponseData(response, {
        listId: list.id,
        content: 'Test Item',
        isCompleted: false,
      });
    });

    it('[ITM-C0020] should create a new item successfully as member', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      await invitations.create({
        listId: list.id,
        inviterId: otherUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
        approved: true,
      });

      const response = await expect200
        .post(`/v1/todo-lists/${list.id}/items`, { content: 'Test Item' }, testUser.token);

      expectResponseData(response, {
        listId: list.id,
        content: 'Test Item',
        isCompleted: false,
      });
    });

    it('[ITM-C0030] should require list access', async () => {
      const list = await createTestList(testUser.id, 'Test List');

      await expect404
        .post(`/v1/todo-lists/${list.id}/items`, { content: 'Test Item' }, otherUser.token);
    });

    it('[ITM-C0040] should not allow owner to add items to archived list', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      await lists.update(
        { id: list.id },
        { isArchived: true },
      );

      await expect404
        .post(`/v1/todo-lists/${list.id}/items`, { content: 'Test Item' }, testUser.token);
    });

    it('[ITM-C0050] should not allow member to add items to archived list', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const invitation = await createTestInvitation(list.id, otherUser.id, testUser.id);
      await invitations.updateById(invitation.id, { status: 'accepted' });
      await lists.update(
        { id: list.id },
        { isArchived: true },
      );

      await expect404
        .post(`/v1/todo-lists/${list.id}/items`, { content: 'Test Item' }, testUser.token);
    });
  });

  describe('GET /v1/todo-lists/:listId/items', () => {
    it('[ITM-R0010] should list all items in a list as owner', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item1 = await createTestItem(list.id, 'Test Item 1');
      const item2 = await createTestItem(list.id, 'Test Item 2');

      const response = await expect200
        .get(`/v1/todo-lists/${list.id}/items`, testUser.token);

      expectListResponse(response, 2, [
        { id: item1.id, content: 'Test Item 1' },
        { id: item2.id, content: 'Test Item 2' },
      ]);
    });

    it('[ITM-R0020] should list all items in a list as member', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      await invitations.create({
        listId: list.id,
        inviterId: otherUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
        approved: true,
      });
      const item1 = await createTestItem(list.id, 'Test Item 1');
      const item2 = await createTestItem(list.id, 'Test Item 2');

      const response = await expect200
        .get(`/v1/todo-lists/${list.id}/items`, testUser.token);

      expectListResponse(response, 2, [
        { id: item1.id, content: 'Test Item 1' },
        { id: item2.id, content: 'Test Item 2' },
      ]);
    });

    it('[ITM-R0030] should not reveal items to non-members', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      await createTestItem(list.id, 'Test Item 1');
      await createTestItem(list.id, 'Test Item 2');

      await expect404
        .get(`/v1/todo-lists/${list.id}/items`, testUser.token);
    });

    it('[ITM-R0035] should not reveal items with accepted but not approved invitation', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      await createTestItem(list.id, 'Test Item 1');
      const invitation = await createTestInvitation(list.id, otherUser.id, testUser.id);
      await invitations.updateById(invitation.id, {
        status: 'accepted',
        approved: false,
      });

      await expect404
        .get(`/v1/todo-lists/${list.id}/items`, testUser.token);
    });
  });

  describe('GET /v1/todo-lists/:listId/items/:id', () => {
    it('[ITM-R0040] should get a specific item as owner', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');

      const response = await expect200
        .get(`/v1/todo-lists/${list.id}/items/${item.id}`, testUser.token);

      expectResponseData(response, {
        id: item.id,
        listId: list.id,
        content: 'Test Item',
        isCompleted: false,
      });
    });

    it('[ITM-R0050] should get a specific item as member', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      await invitations.create({
        listId: list.id,
        inviterId: otherUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
        approved: true,
      });
      const item = await createTestItem(list.id, 'Test Item');

      const response = await expect200
        .get(`/v1/todo-lists/${list.id}/items/${item.id}`, testUser.token);

      expectResponseData(response, {
        id: item.id,
        listId: list.id,
        content: 'Test Item',
        isCompleted: false,
      });
    });

    it('[ITM-R0060] should not reveal item existence to non-members', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const item = await createTestItem(list.id, 'Test Item');

      await expect404
        .get(`/v1/todo-lists/${list.id}/items/${item.id}`, testUser.token);
    });
  });

  describe('PATCH /v1/todo-lists/:listId/items/:id', () => {
    it('[ITM-U0010] should update item content as owner', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');

      const response = await expect200
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}`, { content: 'Updated Item' }, testUser.token);

      expectResponseData(response, {
        id: item.id,
        listId: list.id,
        content: 'Updated Item',
      });
    });

    it('[ITM-U0020] should update item content as member', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      await invitations.create({
        listId: list.id,
        inviterId: otherUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
        approved: true,
      });
      const item = await createTestItem(list.id, 'Test Item');

      const response = await expect200
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}`, { content: 'Updated Item' }, testUser.token);

      expectResponseData(response, {
        id: item.id,
        listId: list.id,
        content: 'Updated Item',
      });
    });

    it('[ITM-U0030] should not allow non-members to update items', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const item = await createTestItem(list.id, 'Test Item');

      await expect404
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}`, { content: 'Updated Item' }, testUser.token);
    });

    it('[ITM-U0035] should not allow updating items in archived list', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      await lists.update(
        { id: list.id },
        { isArchived: true },
      );

      await expect404
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}`, { content: 'Updated Item' }, testUser.token);
    });

    it('[ITM-U0036] should not allow member to update items in archived list', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      await invitations.create({
        listId: list.id,
        inviterId: otherUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
        approved: true,
      });
      const item = await createTestItem(list.id, 'Test Item');
      await lists.update(
        { id: list.id },
        { isArchived: true },
      );

      await expect404
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}`, { content: 'Updated Item' }, testUser.token);
    });
  });

  describe('PATCH /v1/todo-lists/:listId/items/:id/complete', () => {
    it('[ITM-U0040] should mark item as completed as owner', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');

      const response = await expect200
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}/complete`, null, testUser.token);

      const data = expectResponseData(response, {
        id: item.id,
        listId: list.id,
        isCompleted: true,
        completedBy: testUser.id,
      });
      expect(data).toHaveProperty('completedAt');
    });

    it('[ITM-U0045] should not allow completing items in archived list', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      await lists.update(
        { id: list.id },
        { isArchived: true },
      );

      await expect404
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}/complete`, null, testUser.token);
    });

    it('[ITM-U0046] should not allow member to complete items in archived list', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      await invitations.create({
        listId: list.id,
        inviterId: otherUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
        approved: true,
      });
      const item = await createTestItem(list.id, 'Test Item');
      await lists.update(
        { id: list.id },
        { isArchived: true },
      );

      await expect404
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}/complete`, null, testUser.token);
    });

    it('[ITM-U0050] should mark item as completed as member', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      await invitations.create({
        listId: list.id,
        inviterId: otherUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
        approved: true,
      });
      const item = await createTestItem(list.id, 'Test Item');

      const response = await expect200
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}/complete`, null, testUser.token);

      const data = expectResponseData(response, {
        id: item.id,
        listId: list.id,
        isCompleted: true,
        completedBy: testUser.id,
      });
      expect(data).toHaveProperty('completedAt');
    });

    it('[ITM-U0060] should not allow non-members to complete items', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const item = await createTestItem(list.id, 'Test Item');

      await expect404
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}/complete`, null, testUser.token);
    });

    it('[ITM-U0065] should not allow uncompleting items in archived list', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      await items.updateById(item.id, {
        isCompleted: true,
        completedAt: new Date(),
        completedBy: testUser.id,
      });
      await lists.update(
        { id: list.id },
        { isArchived: true },
      );

      await expect404
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}/uncomplete`, null, testUser.token);
    });

    it('[ITM-U0066] should not allow member to uncomplete items in archived list', async () => {
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
      await lists.update(
        { id: list.id },
        { isArchived: true },
      );

      await expect404
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}/uncomplete`, null, testUser.token);
    });
  });

  describe('PATCH /v1/todo-lists/:listId/items/:id/uncomplete', () => {
    it('[ITM-U0070] should mark item as uncompleted as owner', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const item = await createTestItem(list.id, 'Test Item');
      await items.updateById(item.id, {
        isCompleted: true,
        completedAt: new Date(),
        completedBy: testUser.id,
      });

      const response = await expect200
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}/uncomplete`, null, testUser.token);

      const data = expectResponseData(response, {
        id: item.id,
        listId: list.id,
        isCompleted: false,
      });
      expect(data.completedAt).toBeFalsy();
      expect(data.completedBy).toBeFalsy();
    });

    it('[ITM-U0080] should mark item as uncompleted as member', async () => {
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

      const response = await expect200
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}/uncomplete`, null, testUser.token);

      const data = expectResponseData(response, {
        id: item.id,
        listId: list.id,
        isCompleted: false,
      });
      expect(data.completedAt).toBeFalsy();
      expect(data.completedBy).toBeFalsy();
    });

    it('[ITM-U0090] should not allow non-members to uncomplete items', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const item = await createTestItem(list.id, 'Test Item');
      await items.updateById(item.id, {
        isCompleted: true,
        completedAt: new Date(),
        completedBy: otherUser.id,
      });

      await expect404
        .patch(`/v1/todo-lists/${list.id}/items/${item.id}/uncomplete`, null, testUser.token);
    });
  });
});