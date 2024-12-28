import request from 'supertest';
import { Express } from 'express';
import { Containers } from '@omniflex/core';
import { AutoServer } from '@omniflex/infra-express';

import { lists, invitations } from '../../todo.repo';

// Import route handlers
import './../../list.exposed.routes';
import './../../invitation.exposed.routes';

// Import test helpers
import {
  createTestUser,
  createTestList,
  createTestInvitation,
  resetTestData,
} from '../helpers/setup';

describe('List Management Integration Tests', () => {
  const sequelize = Containers.appContainer.resolve('sequelize');

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

  afterEach(async () => {
    await resetTestData();
  });

  describe('POST /v1/todo-lists', () => {
    it('[LIST-C0010] should create a new list successfully', async () => {
      const listData = {
        name: 'New Test List',
      };

      const response = await request(app)
        .post('/v1/todo-lists')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(listData)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        name: listData.name,
        ownerId: testUser.id,
        isArchived: false,
      });

      const invitationResponse = await request(app)
        .get('/v1/todo-lists/invitations/my/accepted')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(invitationResponse.body.data).toHaveLength(1);
      expect(invitationResponse.body.data[0]).toMatchObject({
        listId: response.body.data.id,
        inviterId: testUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
      });
    });

    it('[LIST-C0020] should require authentication', async () => {
      const listData = {
        name: 'New Test List',
      };

      await request(app)
        .post('/v1/todo-lists')
        .send(listData)
        .expect(401);
    });
  });

  describe('GET /v1/todo-lists', () => {
    it('[LIST-R0010] should list user\'s lists', async () => {
      const list1 = await createTestList(testUser.id, 'List 1');
      const list2 = await createTestList(testUser.id, 'List 2');

      const response = await request(app)
        .get('/v1/todo-lists')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: list1.id }),
          expect.objectContaining({ id: list2.id }),
        ]),
      );
    });

    it('[LIST-R0020] should not list archived lists', async () => {
      const archivedList = await createTestList(testUser.id, 'Archived List');
      await lists.updateMany(
        { id: archivedList.id },
        { isArchived: true },
      );

      const response = await request(app)
        .get('/v1/todo-lists')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(0);
    });

    it('[LIST-R0030] should not list other users\' lists', async () => {
      await createTestList(otherUser.id, 'Other User\'s List');

      const response = await request(app)
        .get('/v1/todo-lists')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /v1/todo-lists/:id', () => {
    it('[LIST-R0040] should get a specific list as owner', async () => {
      const list = await createTestList(testUser.id, 'Test List');

      const response = await request(app)
        .get(`/v1/todo-lists/${list.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        id: list.id,
        name: list.name,
        ownerId: testUser.id,
        isArchived: false,
      });
    });

    it('[LIST-R0050] should get a specific list as member', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const invitation = await createTestInvitation(list.id, otherUser.id, testUser.id);
      await invitations.updateById(invitation.id, { status: 'accepted' });

      const response = await request(app)
        .get(`/v1/todo-lists/${list.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        id: list.id,
        name: list.name,
        ownerId: otherUser.id,
        isArchived: false,
      });
    });

    it('[LIST-R0060] should not reveal list to non-members', async () => {
      const otherUser = await createTestUser();
      const list = await createTestList(otherUser.id, 'Other User\'s List');

      await request(app)
        .get(`/v1/todo-lists/${list.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(404);
    });

    it('[LIST-R0070] should require authentication', async () => {
      const list = await createTestList(testUser.id, 'Test List');

      await request(app)
        .get(`/v1/todo-lists/${list.id}`)
        .expect(401);
    });
  });

  describe('GET /v1/todo-lists/archived', () => {
    it('[LIST-R0080] should list user\'s archived lists', async () => {
      const archivedList = await createTestList(testUser.id, 'Archived List');
      await lists.updateMany(
        { id: archivedList.id },
        { isArchived: true },
      );

      const response = await request(app)
        .get('/v1/todo-lists/archived')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        id: archivedList.id,
        isArchived: true,
      });
    });

    it('[LIST-R0090] should not list other users\' archived lists', async () => {
      const otherArchivedList = await createTestList(otherUser.id, 'Other User\'s Archived List');
      await lists.updateMany(
        { id: otherArchivedList.id },
        { isArchived: true },
      );

      const response = await request(app)
        .get('/v1/todo-lists/archived')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('PATCH /v1/todo-lists/:id/archive', () => {
    it('[LIST-A0010] should archive a list as owner', async () => {
      const testList = await createTestList(testUser.id, 'Test List');

      const response = await request(app)
        .patch(`/v1/todo-lists/${testList.id}/archive`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        id: testList.id,
        isArchived: true,
      });
    });

    it('[LIST-A0020] should not allow member to archive list', async () => {
      const list = await createTestList(otherUser.id, 'Other User\'s List');
      const invitation = await createTestInvitation(list.id, otherUser.id, testUser.id);
      await invitations.updateById(invitation.id, { status: 'accepted' });

      await request(app)
        .patch(`/v1/todo-lists/${list.id}/archive`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(404);
    });

    it('[LIST-A0030] should not reveal list existence to non-owners', async () => {
      const otherList = await createTestList(otherUser.id, 'Other User\'s List');

      await request(app)
        .patch(`/v1/todo-lists/${otherList.id}/archive`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(404);
    });
  });
});