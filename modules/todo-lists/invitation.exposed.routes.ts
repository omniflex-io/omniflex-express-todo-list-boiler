// #swagger.file.tags = ['Todo Lists Invitations']
// #swagger.file.basePath = '/v1/todo-lists'

import { auth } from '@/middlewares/auth';
import { ExposedRouter } from '@/servers';
import { tryValidateBody } from '@omniflex/infra-express/helpers/joi';

import { TInvitation } from './models';
import { invitations, lists } from './todo.repo';
import { createInvitationSchema } from './http.schemas';

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
    return super.tryUpdate(
      { status: 'accepted' },
      {
        respondOne: entity => this.respondOne(entity),
      },
    );
  }

  tryRejectInvitation() {
    return super.tryUpdate(
      { status: 'rejected' },
      {
        respondOne: entity => this.respondOne(entity),
      },
    );
  }

  tryGetOne() {
    return this.tryAction(() => this.respondRequired('invitation'));
  }
}

const byListId = RequiredDbEntries.byId(lists, req => req.params.listId, true);

const byInvitationId = RequiredDbEntries.byPathId(invitations, 'invitation');

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
    InvitationController.create(controller => controller.tryCreate()))

  .post('/invitations/:id/accept',
    // #swagger.summary = 'Accept an invitation'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['id'] = { description: 'UUID of the invitation' }

    auth.requireExposed,
    byInvitationId,
    InvitationController.create(controller => controller.tryAcceptInvitation()))

  .post('/invitations/:id/reject',
    // #swagger.summary = 'Reject an invitation'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['id'] = { description: 'UUID of the invitation' }

    auth.requireExposed,
    byInvitationId,
    InvitationController.create(controller => controller.tryRejectInvitation()));