import request from 'supertest';
import { Express } from 'express';
import { Containers } from '@omniflex/core';
import { AutoServer } from '@omniflex/infra-express';

import { invitations } from '../../todo.repo';

// Import route handlers
import './../../invitation.exposed.routes';
import './../../list.exposed.routes';

// Import test helpers
import {
  createTestUser,
  createTestList,
  createTestInvitation,
  expectResponseData,
  expectListResponse,
} from '../helpers/setup';

describe('Invitation Management Integration Tests', () => {
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

  describe('POST /v1/todo-lists/:listId/invitations', () => {
    it('[INV-C0010] should create a new invitation successfully', async () => {
      const list = await createTestList(testUser.id, 'Test List');

      const response = await request(app)
        .post(`/v1/todo-lists/${list.id}/invitations`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ inviteeId: otherUser.id })
        .expect(200);

      expectResponseData(response, {
        listId: list.id,
        inviterId: testUser.id,
        inviteeId: otherUser.id,
        status: 'pending',
        approved: true,
      });
    });

    it('[INV-C0020] should require list ownership', async () => {
      const list = await createTestList(otherUser.id, 'Test List');

      await request(app)
        .post(`/v1/todo-lists/${list.id}/invitations`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ inviteeId: otherUser.id })
        .expect(404);
    });
  });

  describe('GET /v1/todo-lists/invitations/my/pending', () => {
    it('[INV-R0010] should list pending invitations', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      await createTestInvitation(list.id, testUser.id, otherUser.id);

      const response = await request(app)
        .get('/v1/todo-lists/invitations/my/pending')
        .set('Authorization', `Bearer ${otherUser.token}`)
        .expect(200);

      expectListResponse(response, 1, [{
        listId: list.id,
        inviterId: testUser.id,
        inviteeId: otherUser.id,
        status: 'pending',
      }]);
    });
  });

  describe('GET /v1/todo-lists/invitations/my/accepted', () => {
    it('[INV-R0020] should list accepted invitations', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const invitation = await createTestInvitation(list.id, testUser.id, otherUser.id);
      await invitations.updateById(invitation.id, { status: 'accepted' });

      const response = await request(app)
        .get('/v1/todo-lists/invitations/my/accepted')
        .set('Authorization', `Bearer ${otherUser.token}`)
        .expect(200);

      expectListResponse(response, 1, [{
        listId: list.id,
        inviterId: testUser.id,
        inviteeId: otherUser.id,
        status: 'accepted',
      }]);
    });
  });

  describe('PATCH /v1/todo-lists/invitations/:id/accept', () => {
    it('[INV-U0010] should accept an invitation', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const invitation = await createTestInvitation(list.id, testUser.id, otherUser.id);

      const response = await request(app)
        .patch(`/v1/todo-lists/invitations/${invitation.id}/accept`)
        .set('Authorization', `Bearer ${otherUser.token}`)
        .expect(200);

      expectResponseData(response, {
        listId: list.id,
        inviterId: testUser.id,
        inviteeId: otherUser.id,
        status: 'accepted',
      });
    });

    it('[INV-U0020] should only allow invitee to accept', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const invitation = await createTestInvitation(list.id, testUser.id, otherUser.id);

      await request(app)
        .patch(`/v1/todo-lists/invitations/${invitation.id}/accept`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(404);
    });
  });

  describe('PATCH /v1/todo-lists/invitations/:id/reject', () => {
    it('[INV-U0030] should reject an invitation', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const invitation = await createTestInvitation(list.id, testUser.id, otherUser.id);

      const response = await request(app)
        .patch(`/v1/todo-lists/invitations/${invitation.id}/reject`)
        .set('Authorization', `Bearer ${otherUser.token}`)
        .expect(200);

      expectResponseData(response, {
        listId: list.id,
        inviterId: testUser.id,
        inviteeId: otherUser.id,
        status: 'rejected',
      });
    });

    it('[INV-U0040] should only allow invitee to reject', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const invitation = await createTestInvitation(list.id, testUser.id, otherUser.id);

      await request(app)
        .patch(`/v1/todo-lists/invitations/${invitation.id}/reject`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(404);
    });
  });
});