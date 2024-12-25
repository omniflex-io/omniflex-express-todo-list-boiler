// #swagger.file.tags = ['Todo Lists Invitations']
// #swagger.file.basePath = '/v1/todo-lists'

import { auth } from '@/middlewares/auth';
import { ExposedRouter } from '@/servers';
import { tryValidateBody } from '@omniflex/infra-express/helpers/joi';

import { TInvitation } from './models';
import { invitations, lists } from './todo.repo';
import { createInvitationSchema, updateInvitationSchema } from './http.schemas';

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
    const { listId } = this.req.params;
    const { inviteeId } = this.req.body;
    return super.tryCreate({
      listId,
      inviterId: this.user.id,
      inviteeId,
      status: 'pending',
    });
  }

  tryListByList() {
    const { listId } = this.req.params;
    return super.tryListPaginated({ listId });
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

  tryUpdateStatus() {
    return super.tryUpdate();
  }

  tryGetOne() {
    return this.tryAction(() => this.respondRequired('invitation'));
  }
}

const byListId = RequiredDbEntries.byId(lists, req => req.params.listId, true);

const byInvitationIdOfList = [
  byListId,
  RequiredDbEntries.firstMatch(invitations, req => ({
    id: req.params.id,
    listId: req.params.listId,
  }), 'invitation'),
];

const byInvitationId = RequiredDbEntries.byPathId(invitations, 'invitation');

const router = ExposedRouter('/v1/todo-lists');

router
  .get('/invitations',
    // #swagger.summary = 'List all pending invitations for the current user'
    // #swagger.security = [{"bearerAuth": []}]

    auth.requireExposed,
    InvitationController.create(controller => controller.tryListMyInvitations()))

  .get('/invited',
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

  .patch('/invitations/:id',
    // #swagger.summary = 'Update invitation status'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['id'] = { description: 'UUID of the invitation' }
    // #swagger.jsonBody = required|components/schemas/appModule/toDoLists/updateInvitation

    tryValidateBody(updateInvitationSchema),
    auth.requireExposed,
    byInvitationId,
    InvitationController.create(controller => controller.tryUpdateStatus())); 