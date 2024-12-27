import request from 'supertest';
import { Express } from 'express';
import { Containers } from '@omniflex/core';
import { AutoServer } from '@omniflex/infra-express';

import { lists, invitations } from '../../todo.repo';

// Import route handlers
import './../../list.exposed.routes';
import './../../invitation.exposed.routes';

// Import test helpers
import { createTestUser, resetTestData } from '../helpers/setup';

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
    it('should create a new list successfully', async () => {
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

    it('should require authentication', async () => {
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
    it('should list user\'s lists', async () => {
      const list1 = await lists.create({
        ownerId: testUser.id,
        name: 'List 1',
        isArchived: false,
      });

      const list2 = await lists.create({
        ownerId: testUser.id,
        name: 'List 2',
        isArchived: false,
      });

      await invitations.create({
        listId: list1.id,
        inviterId: testUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
        approved: true,
      });

      await invitations.create({
        listId: list2.id,
        inviterId: testUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
        approved: true,
      });

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

    it('should not list archived lists', async () => {
      const archivedList = await lists.create({
        ownerId: testUser.id,
        name: 'Archived List',
        isArchived: true,
      });

      await invitations.create({
        listId: archivedList.id,
        inviterId: testUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
        approved: true,
      });

      const response = await request(app)
        .get('/v1/todo-lists')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(0);
    });

    it('should not list other users\' lists', async () => {
      const otherList = await lists.create({
        ownerId: otherUser.id,
        name: 'Other User\'s List',
        isArchived: false,
      });

      await invitations.create({
        listId: otherList.id,
        inviterId: otherUser.id,
        inviteeId: otherUser.id,
        status: 'accepted',
        approved: true,
      });

      const response = await request(app)
        .get('/v1/todo-lists')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /v1/todo-lists/:id', () => {
    it('should get a specific list as owner', async () => {
      const list = await lists.create({
        ownerId: testUser.id,
        name: 'Test List',
        isArchived: false,
      });

      await invitations.create({
        listId: list.id,
        inviterId: testUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
        approved: true,
      });

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

    it('should get a specific list as member', async () => {
      const list = await lists.create({
        ownerId: otherUser.id,
        name: 'Other User\'s List',
        isArchived: false,
      });

      await invitations.create({
        listId: list.id,
        inviterId: otherUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
        approved: true,
      });

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

    it('should not reveal list existence to non-members', async () => {
      const otherList = await lists.create({
        ownerId: otherUser.id,
        name: 'Other User\'s List',
        isArchived: false,
      });

      await request(app)
        .get(`/v1/todo-lists/${otherList.id}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(404);
    });
  });

  describe('GET /v1/todo-lists/archived', () => {
    it('should list user\'s archived lists', async () => {
      const archivedList = await lists.create({
        ownerId: testUser.id,
        name: 'Archived List',
        isArchived: true,
      });

      await invitations.create({
        listId: archivedList.id,
        inviterId: testUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
        approved: true,
      });

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

    it('should not list other users\' archived lists', async () => {
      const otherArchivedList = await lists.create({
        ownerId: otherUser.id,
        name: 'Other User\'s Archived List',
        isArchived: true,
      });

      await invitations.create({
        listId: otherArchivedList.id,
        inviterId: otherUser.id,
        inviteeId: otherUser.id,
        status: 'accepted',
        approved: true,
      });

      const response = await request(app)
        .get('/v1/todo-lists/archived')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('PATCH /v1/todo-lists/:id/archive', () => {
    it('should archive a list', async () => {
      const testList = await lists.create({
        ownerId: testUser.id,
        name: 'Test List',
        isArchived: false,
      });

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

    it('should not reveal list existence to non-owners', async () => {
      const otherList = await lists.create({
        ownerId: otherUser.id,
        name: 'Other User\'s List',
        isArchived: false,
      });

      await request(app)
        .patch(`/v1/todo-lists/${otherList.id}/archive`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(404);
    });
  });
});