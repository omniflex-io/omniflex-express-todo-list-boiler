import request from 'supertest';
import { Express } from 'express';
import { Server } from 'http';
import { Containers } from '@omniflex/core';
import { AutoServer } from '@omniflex/infra-express';

import { lists, invitations } from '../../todo.repo';

// Import route handlers
import './../../list.exposed.routes';

// Import test helpers
import { createTestUser, resetTestData } from '../helpers/setup';

describe('List Management Integration Tests', () => {
  const sequelize = Containers.appContainer.resolve('sequelize');

  let app: Express;
  let servers: Server[];
  let testUser: { id: string; token: string; };

  beforeAll(async () => {
    if (!app) {
      const _servers = await AutoServer.start();
      const exposedServer = _servers.find(({ type }) => type === 'exposed')!;

      app = exposedServer.app;
      servers = _servers.map(({ server }) => server!).filter(Boolean);
    }

    testUser = await createTestUser();
    await sequelize.sync({ force: true });
  });

  afterAll(() => {
    for (const server of servers) {
      server.closeAllConnections();
      server.close();
    }
  });

  describe('POST /lists', () => {
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
        .get('/invitations/my/accepted')
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
        .post('/lists')
        .send(listData)
        .expect(401);
    });
  });

  describe('GET /lists', () => {
    it('should list user\'s lists', async () => {
      const list1 = await lists.create({
        ownerId: testUser.id,
        title: 'List 1',
        isArchived: false,
      });

      const list2 = await lists.create({
        ownerId: testUser.id,
        title: 'List 2',
        isArchived: false,
      });

      await invitations.create({
        listId: list1.id,
        inviterId: testUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
      });

      await invitations.create({
        listId: list2.id,
        inviterId: testUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
      });

      const response = await request(app)
        .get('/lists')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: list1.id }),
          expect.objectContaining({ id: list2.id }),
        ])
      );
    });

    it('should not list archived lists', async () => {
      const archivedList = await lists.create({
        ownerId: testUser.id,
        title: 'Archived List',
        isArchived: true,
      });

      await invitations.create({
        listId: archivedList.id,
        inviterId: testUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
      });

      const response = await request(app)
        .get('/lists')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /lists/archived', () => {
    it('should list user\'s archived lists', async () => {
      const archivedList = await lists.create({
        ownerId: testUser.id,
        title: 'Archived List',
        isArchived: true,
      });

      await invitations.create({
        listId: archivedList.id,
        inviterId: testUser.id,
        inviteeId: testUser.id,
        status: 'accepted',
      });

      const response = await request(app)
        .get('/lists/archived')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        id: archivedList.id,
        isArchived: true,
      });
    });
  });

  describe('PATCH /lists/:id/archive', () => {
    it('should archive a list', async () => {
      const testList = await lists.create({
        ownerId: testUser.id,
        title: 'Test List',
        isArchived: false,
      });

      const response = await request(app)
        .patch(`/lists/${testList.id}/archive`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        id: testList.id,
        isArchived: true,
      });
    });

    it('should only allow owner to archive', async () => {
      const otherUser = await createTestUser();
      const otherList = await lists.create({
        ownerId: otherUser.id,
        title: 'Other User\'s List',
        isArchived: false,
      });

      await request(app)
        .patch(`/lists/${otherList.id}/archive`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(403);
    });
  });
});