// #swagger.file.tags = ['Todo Lists Invitations']
// #swagger.file.basePath = '/v1/todo-lists'

import { auth } from '@/middlewares/auth';
import { ExposedRouter } from '@/servers';
import { tryValidateBody } from '@omniflex/infra-express/helpers/joi';

import { TInvitation } from './models';
import { invitations } from './todo.repo';
import { createInvitationSchema, createInvitationCodeSchema } from './http.schemas';
import {
  validateInvitationAcceptance,
  validateInvitationRejection,
  validateInvitationApproval,
  validateInvitationCodeJoin,
  validateListInvitationsAccess,
  validateInvitationViewAccess,
} from './middlewares/invitation';
import {
  byListId,
  validateListOwner,
} from './middlewares/access';

import {
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
      const { listId } = this.req.params;
      const code = this.res.locals.required.invitationCode;

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
    return super.tryUpdate({ status: 'accepted' });
  }

  tryRejectInvitation() {
    return super.tryUpdate({ status: 'rejected' });
  }

  tryApproveInvitation() {
    return super.tryUpdate({ approved: true });
  }

  tryGetOne() {
    return this.tryAction(() => this.respondRequired('invitation'));
  }
}

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
    // #swagger.summary = 'List all invitations in a list (owner only)'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }

    auth.requireExposed,
    validateListInvitationsAccess,
    InvitationController.create(controller => controller.tryListByList()))

  .get('/:listId/invitations/codes',
    // #swagger.summary = 'List all invitation codes for a list (owner only)'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }

    auth.requireExposed,
    validateListInvitationsAccess,
    InvitationController.create(controller => controller.tryListInvitationCodes()))

  .get('/invitations/:id',
    // #swagger.summary = 'Get a specific invitation (owner, inviter, or invitee only)'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['id'] = { description: 'UUID of the invitation' }

    auth.requireExposed,
    validateInvitationViewAccess,
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
    validateInvitationCodeJoin,
    InvitationController.create(controller => controller.tryJoinByInvitationCode()))

  .patch('/invitations/:id/accept',
    // #swagger.summary = 'Accept an invitation'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['id'] = { description: 'UUID of the invitation' }

    auth.requireExposed,
    validateInvitationAcceptance,
    InvitationController.create(controller => controller.tryAcceptInvitation()))

  .patch('/invitations/:id/reject',
    // #swagger.summary = 'Reject an invitation'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['id'] = { description: 'UUID of the invitation' }

    auth.requireExposed,
    validateInvitationRejection,
    InvitationController.create(controller => controller.tryRejectInvitation()))

  .patch('/invitations/:id/approve',
    // #swagger.summary = 'Approve an invitation'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['id'] = { description: 'UUID of the invitation' }

    auth.requireExposed,
    validateInvitationApproval,
    InvitationController.create(controller => controller.tryApproveInvitation()));