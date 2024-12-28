import { Express } from 'express';
import { Containers } from '@omniflex/core';
import { AutoServer } from '@omniflex/infra-express';

import { invitations, invitationCodes } from '../../todo.repo';

// Import route handlers
import './../../invitation.exposed.routes';
import './../../list.exposed.routes';

// Import test helpers
import { RequestHelper } from '../helpers/request';

import {
  createTestUser,
  createTestList,
  createTestInvitation,
  expectResponseData,
  expectListResponse,
} from '../helpers/setup';

describe('Invitation Management Integration Tests', () => {
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

  describe('POST /v1/todo-lists/:listId/invitations', () => {
    it('[INV-C0010] should create a new invitation successfully', async () => {
      const list = await createTestList(testUser.id, 'Test List');

      const response = await expect200
        .post(`/v1/todo-lists/${list.id}/invitations`, { inviteeId: otherUser.id }, testUser.token);

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

      await expect404
        .post(`/v1/todo-lists/${list.id}/invitations`, { inviteeId: otherUser.id }, testUser.token);
    });

    it('[INV-C0030] should require authentication', async () => {
      const list = await createTestList(testUser.id, 'Test List');

      await expect401
        .post(`/v1/todo-lists/${list.id}/invitations`, { inviteeId: otherUser.id });
    });

    it('[INV-C0040] should always set approved to true for direct invitations', async () => {
      const list = await createTestList(testUser.id, 'Test List');

      const response = await expect200
        .post(`/v1/todo-lists/${list.id}/invitations`, { inviteeId: otherUser.id }, testUser.token);

      expectResponseData(response, {
        listId: list.id,
        inviterId: testUser.id,
        inviteeId: otherUser.id,
        status: 'pending',
        approved: true,
      });
    });
  });

  describe('GET /v1/todo-lists/invitations/my/pending', () => {
    it('[INV-R0010] should list pending invitations', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      await createTestInvitation(list.id, testUser.id, otherUser.id);

      const response = await expect200
        .get('/v1/todo-lists/invitations/my/pending', otherUser.token);

      expectListResponse(response, 1, [{
        listId: list.id,
        inviterId: testUser.id,
        inviteeId: otherUser.id,
        status: 'pending',
        approved: true,
      }]);
    });

    it('[INV-R0015] should require authentication', async () => {
      await expect401.get('/v1/todo-lists/invitations/my/pending');
    });
  });

  describe('GET /v1/todo-lists/invitations/my/accepted', () => {
    it('[INV-R0020] should list accepted invitations', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const invitation = await createTestInvitation(list.id, testUser.id, otherUser.id);
      await invitations.updateById(invitation.id, { status: 'accepted' });

      const response = await expect200
        .get('/v1/todo-lists/invitations/my/accepted', otherUser.token);

      expectListResponse(response, 1, [{
        listId: list.id,
        inviterId: testUser.id,
        inviteeId: otherUser.id,
        status: 'accepted',
      }]);
    });

    it('[INV-R0025] should require authentication', async () => {
      await expect401.get('/v1/todo-lists/invitations/my/accepted');
    });
  });

  describe('PATCH /v1/todo-lists/invitations/:id/approve', () => {
    it('[INV-U0005] should approve an invitation as owner', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const invitation = await createTestInvitation(list.id, testUser.id, otherUser.id);
      await invitations.updateById(invitation.id, { approved: false });

      const response = await expect200
        .patch(`/v1/todo-lists/invitations/${invitation.id}/approve`, null, testUser.token);

      expectResponseData(response, {
        listId: list.id,
        inviterId: testUser.id,
        inviteeId: otherUser.id,
        status: 'pending',
        approved: true,
      });
    });

    it('[INV-U0006] should not allow non-owner to approve invitation', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const invitation = await createTestInvitation(list.id, testUser.id, otherUser.id);
      await invitations.updateById(invitation.id, { approved: false });

      await expect404
        .patch(`/v1/todo-lists/invitations/${invitation.id}/approve`, null, otherUser.token);
    });

    it('[INV-U0007] should require authentication', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const invitation = await createTestInvitation(list.id, testUser.id, otherUser.id);
      await invitations.updateById(invitation.id, { approved: false });

      await expect401
        .patch(`/v1/todo-lists/invitations/${invitation.id}/approve`, null);
    });
  });

  describe('PATCH /v1/todo-lists/invitations/:id/accept', () => {
    it('[INV-U0010] should accept an invitation', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const invitation = await createTestInvitation(list.id, testUser.id, otherUser.id);

      const response = await expect200
        .patch(`/v1/todo-lists/invitations/${invitation.id}/accept`, null, otherUser.token);

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

      await expect404
        .patch(`/v1/todo-lists/invitations/${invitation.id}/accept`, null, testUser.token);
    });

    it('[INV-U0025] should require authentication', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const invitation = await createTestInvitation(list.id, testUser.id, otherUser.id);

      await expect401
        .patch(`/v1/todo-lists/invitations/${invitation.id}/accept`, null);
    });

    it('[INV-U0026] should accept unapproved invitation', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const invitation = await createTestInvitation(list.id, testUser.id, otherUser.id);
      await invitations.updateById(invitation.id, { approved: false });

      const response = await expect200
        .patch(`/v1/todo-lists/invitations/${invitation.id}/accept`, null, otherUser.token);

      expectResponseData(response, {
        listId: list.id,
        inviterId: testUser.id,
        inviteeId: otherUser.id,
        status: 'accepted',
        approved: false,
      });
    });
  });

  describe('PATCH /v1/todo-lists/invitations/:id/reject', () => {
    it('[INV-U0030] should reject an invitation', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const invitation = await createTestInvitation(list.id, testUser.id, otherUser.id);

      const response = await expect200
        .patch(`/v1/todo-lists/invitations/${invitation.id}/reject`, null, otherUser.token);

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

      await expect404
        .patch(`/v1/todo-lists/invitations/${invitation.id}/reject`, null, testUser.token);
    });

    it('[INV-U0045] should require authentication', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const invitation = await createTestInvitation(list.id, testUser.id, otherUser.id);

      await expect401
        .patch(`/v1/todo-lists/invitations/${invitation.id}/reject`, null);
    });

    it('[INV-U0046] should reject unapproved invitation', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const invitation = await createTestInvitation(list.id, testUser.id, otherUser.id);
      await invitations.updateById(invitation.id, { approved: false });

      const response = await expect200
        .patch(`/v1/todo-lists/invitations/${invitation.id}/reject`, null, otherUser.token);

      expectResponseData(response, {
        listId: list.id,
        inviterId: testUser.id,
        inviteeId: otherUser.id,
        status: 'rejected',
        approved: false,
      });
    });
  });

  describe('GET /v1/todo-lists/:listId/invitations', () => {
    it('[INV-R0030] should list invitations as owner', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      await createTestInvitation(list.id, testUser.id, otherUser.id);

      const response = await expect200
        .get(`/v1/todo-lists/${list.id}/invitations`, testUser.token);

      expectListResponse(response, 2, [
        {
          listId: list.id,
          inviterId: testUser.id,
          inviteeId: testUser.id,
          status: 'accepted',
          approved: true,
        },
        {
          listId: list.id,
          inviterId: testUser.id,
          inviteeId: otherUser.id,
          status: 'pending',
          approved: true,
        },
      ]);
    });

    it('[INV-R0035] should not list invitations as member', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const invitation = await createTestInvitation(list.id, testUser.id, otherUser.id);
      await invitations.updateById(invitation.id, { status: 'accepted', approved: true });

      await expect404
        .get(`/v1/todo-lists/${list.id}/invitations`, otherUser.token);
    });

    it('[INV-R0036] should not list invitations of others\' lists', async () => {
      const list = await createTestList(otherUser.id, 'Test List');
      await createTestInvitation(list.id, otherUser.id, testUser.id);

      await expect404
        .get(`/v1/todo-lists/${list.id}/invitations`, testUser.token);
    });
  });

  describe('GET /v1/todo-lists/invitations/:invitationId', () => {
    it('[INV-R0040] should get invitation as owner', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const invitation = await createTestInvitation(list.id, testUser.id, otherUser.id);

      const response = await expect200
        .get(`/v1/todo-lists/invitations/${invitation.id}`, testUser.token);

      expectResponseData(response, {
        listId: list.id,
        inviterId: testUser.id,
        inviteeId: otherUser.id,
        status: 'pending',
      });
    });

    it('[INV-R0041] should get invitation as invitee', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const invitation = await createTestInvitation(list.id, testUser.id, otherUser.id);

      const response = await expect200
        .get(`/v1/todo-lists/invitations/${invitation.id}`, otherUser.token);

      expectResponseData(response, {
        listId: list.id,
        inviterId: testUser.id,
        inviteeId: otherUser.id,
        status: 'pending',
      });
    });

    it('[INV-R0042] should not get others\' invitations', async () => {
      const list = await createTestList(otherUser.id, 'Other List');
      const thirdUser = await createTestUser();
      const invitation = await createTestInvitation(list.id, otherUser.id, thirdUser.id);

      await expect404
        .get(`/v1/todo-lists/invitations/${invitation.id}`, testUser.token);
    });
  });

  describe('POST /v1/todo-lists/:listId/invitations/codes/:invitationCodeId', () => {
    it('[INV-C0050] should join list with auto-approve code', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const code = await invitationCodes.create({
        listId: list.id,
        inviterId: testUser.id,
        autoApprove: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const response = await expect200
        .post(`/v1/todo-lists/${list.id}/invitations/codes/${code.id}`, null, otherUser.token);

      expectResponseData(response, {
        listId: list.id,
        inviterId: testUser.id,
        inviteeId: otherUser.id,
        status: 'accepted',
        approved: true,
      });
    });

    it('[INV-C0051] should join list with manual-approve code', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const code = await invitationCodes.create({
        listId: list.id,
        inviterId: testUser.id,
        autoApprove: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const response = await expect200
        .post(`/v1/todo-lists/${list.id}/invitations/codes/${code.id}`, null, otherUser.token);

      expectResponseData(response, {
        listId: list.id,
        inviterId: testUser.id,
        inviteeId: otherUser.id,
        status: 'accepted',
        approved: false,
      });
    });

    it('[INV-C0052] should not allow access with manual-approve code until approved', async () => {
      const list = await createTestList(testUser.id, 'Test List');
      const code = await invitationCodes.create({
        listId: list.id,
        inviterId: testUser.id,
        autoApprove: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      const joinResponse = await expect200
        .post(`/v1/todo-lists/${list.id}/invitations/codes/${code.id}`, null, otherUser.token);
      const invitation = expectResponseData(joinResponse, {
        listId: list.id,
        inviterId: testUser.id,
        inviteeId: otherUser.id,
        status: 'accepted',
        approved: false,
      });

      // Accept the invitation
      await expect200
        .patch(`/v1/todo-lists/invitations/${invitation.id}/accept`, null, otherUser.token);

      // Try to access the list (should fail)
      await expect404
        .get(`/v1/todo-lists/${list.id}`, otherUser.token);

      // Owner approves the invitation
      await expect200
        .patch(`/v1/todo-lists/invitations/${invitation.id}/approve`, null, testUser.token);

      // Try to access the list again (should succeed)
      await expect200
        .get(`/v1/todo-lists/${list.id}`, otherUser.token);
    });
  });
});