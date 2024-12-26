// #swagger.file.tags = ['Todo Lists Invitations']
// #swagger.file.basePath = '/v1/todo-lists'

import { auth } from '@/middlewares/auth';
import { ExposedRouter } from '@/servers';
import { tryValidateBody } from '@omniflex/infra-express/helpers/joi';
import { errors } from '@omniflex/core';

import { TInvitation } from './models';
import { invitations, invitationCodes, lists } from './todo.repo';
import { createInvitationSchema, createInvitationCodeSchema } from './http.schemas';

import {
  RequiredDbEntries,
  getControllerCreator,
  BaseEntitiesController,
} from '@omniflex/infra-express';

class InvitationController extends BaseEntitiesController<TInvitation> {
  constructor(req, res, next) {
    super(req, res, next, invitations);
  }

  static create = getControllerCreator(InvitationController);

  tryCreate() {
    return this.tryAction(async () => {
      const { listId } = this.req.params;
      const { inviteeId } = this.req.body;

      return super.tryCreate({
        listId,
        inviterId: this.user.id,
        inviteeId,
        approved: true,
        status: 'pending',
      });
    });
  }

  tryCreateInvitationCode() {
    return this.tryAction(async () => {
      const { listId } = this.req.params;
      const { autoApprove } = this.req.body;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      return super.tryCreate({
        listId,
        inviterId: this.user.id,
        expiresAt,
        autoApprove,
      });
    });
  }

  tryJoinByInvitationCode() {
    return this.tryAction(async () => {
      const { listId, id } = this.req.params;
      const code = await invitationCodes.findOne({ id, listId });

      if (!code) {
        throw errors.notFound('Invitation code not found');
      }

      if (code.expiresAt < new Date()) {
        throw errors.badRequest('Invitation code has expired');
      }

      return super.tryCreate({
        listId,
        inviterId: code.inviterId,
        inviteeId: this.user.id,
        approved: code.autoApprove,
        status: 'pending',
      });
    });
  }

  tryListByList() {
    return this.tryAction(async () => {
      const { listId } = this.req.params;
      return super.tryListPaginated({ listId });
    });
  }

  tryListInvitationCodes() {
    return this.tryAction(async () => {
      const { listId } = this.req.params;
      return super.tryListPaginated({ listId });
    });
  }

  tryListMyInvitations() {
    return super.tryListPaginated({
      inviteeId: this.user.id,
      status: 'pending',
    });
  }

  tryListMyInvitedLists() {
    return super.tryListPaginated({
      inviteeId: this.user.id,
      status: 'accepted',
    });
  }

  tryAcceptInvitation() {
    return this.tryAction(async () => {
      const { id } = this.req.params;
      const invitation = await invitations.findOne({ id });

      if (!invitation) {
        throw errors.notFound('Invitation not found');
      }

      if (invitation.inviteeId !== this.user.id) {
        throw errors.forbidden();
      }

      return super.tryUpdate({ status: 'accepted' });
    });
  }

  tryRejectInvitation() {
    return this.tryAction(async () => {
      const { id } = this.req.params;
      const invitation = await invitations.findOne({ id });

      if (!invitation) {
        throw errors.notFound('Invitation not found');
      }

      if (invitation.inviteeId !== this.user.id) {
        throw errors.forbidden();
      }

      return super.tryUpdate({ status: 'rejected' });
    });
  }

  tryApproveInvitation() {
    return this.tryAction(async () => {
      const { id } = this.req.params;
      const invitation = await invitations.findOne({ id });

      if (!invitation) {
        throw errors.notFound('Invitation not found');
      }

      const list = await lists.findOne({ id: invitation.listId });

      if (!list) {
        throw errors.notFound('List not found');
      }

      if (list.ownerId !== this.user.id) {
        throw errors.forbidden();
      }

      return super.tryUpdate({ approved: true });
    });
  }

  tryGetOne() {
    return this.tryAction(() => this.respondRequired('invitation'));
  }
}

const byListId = RequiredDbEntries.byId(lists, req => req.params.listId, true);

const byInvitationId = RequiredDbEntries.byPathId(invitations, 'invitation');

const validateListOwner = RequiredDbEntries.firstMatch(
  lists,
  (req, res) => ({
    id: req.params.listId,
    ownerId: res.locals.user.id,
  }),
  true,
);

const router = ExposedRouter('/v1/todo-lists');

router
  .get('/invitations/my/pending',
    // #swagger.summary = 'List all pending invitations for the current user'
    // #swagger.security = [{"bearerAuth": []}]

    auth.requireExposed,
    InvitationController.create(controller => controller.tryListMyInvitations()))

  .get('/invitations/my/accepted',
    // #swagger.summary = 'List all lists where the current user is invited and accepted'
    // #swagger.security = [{"bearerAuth": []}]

    auth.requireExposed,
    InvitationController.create(controller => controller.tryListMyInvitedLists()))

  .get('/:listId/invitations',
    // #swagger.summary = 'List all invitations in a list'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }

    auth.requireExposed,
    byListId,
    InvitationController.create(controller => controller.tryListByList()))

  .get('/:listId/invitations/codes',
    // #swagger.summary = 'List all invitation codes for a list'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }

    auth.requireExposed,
    byListId,
    validateListOwner,
    InvitationController.create(controller => controller.tryListInvitationCodes()))

  .get('/invitations/:id',
    // #swagger.summary = 'Get a specific invitation'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['id'] = { description: 'UUID of the invitation' }

    auth.requireExposed,
    byInvitationId,
    InvitationController.create(controller => controller.tryGetOne()))

  .post('/:listId/invitations',
    // #swagger.summary = 'Create a new invitation'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }
    // #swagger.jsonBody = required|components/schemas/appModule/toDoLists/createInvitation

    tryValidateBody(createInvitationSchema),
    auth.requireExposed,
    byListId,
    validateListOwner,
    InvitationController.create(controller => controller.tryCreate()))

  .post('/:listId/invitations/codes',
    // #swagger.summary = 'Generate a new invitation code'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }
    // #swagger.jsonBody = required|components/schemas/appModule/toDoLists/createInvitationCode

    tryValidateBody(createInvitationCodeSchema),
    auth.requireExposed,
    byListId,
    validateListOwner,
    InvitationController.create(controller => controller.tryCreateInvitationCode()))

  .post('/:listId/invitations/codes/:id',
    // #swagger.summary = 'Join a list using an invitation code'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }
    // #swagger.parameters['id'] = { description: 'UUID of the invitation code' }

    auth.requireExposed,
    byListId,
    InvitationController.create(controller => controller.tryJoinByInvitationCode()))

  .patch('/invitations/:id/accept',
    // #swagger.summary = 'Accept an invitation'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['id'] = { description: 'UUID of the invitation' }

    auth.requireExposed,
    byInvitationId,
    InvitationController.create(controller => controller.tryAcceptInvitation()))

  .patch('/invitations/:id/reject',
    // #swagger.summary = 'Reject an invitation'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['id'] = { description: 'UUID of the invitation' }

    auth.requireExposed,
    byInvitationId,
    InvitationController.create(controller => controller.tryRejectInvitation()))

  .patch('/invitations/:id/approve',
    // #swagger.summary = 'Approve an invitation'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['id'] = { description: 'UUID of the invitation' }

    auth.requireExposed,
    byInvitationId,
    InvitationController.create(controller => controller.tryApproveInvitation()));