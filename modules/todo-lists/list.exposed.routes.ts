// #swagger.file.tags = ['Todo Lists']
// #swagger.file.basePath = '/v1/todo-lists'

import { auth } from '@/middlewares/auth';
import { ExposedRouter } from '@/servers';
import { tryValidateBody } from '@omniflex/infra-express/helpers/joi';

import { TList } from './models';
import { lists, invitations } from './todo.repo';
import { createListSchema } from './http.schemas';
import { validateListAccess } from './middlewares';

import {
  getControllerCreator,
  BaseEntitiesController,
} from '@omniflex/infra-express';

class ListController extends BaseEntitiesController<TList> {
  constructor(req, res, next) {
    super(req, res, next, lists);
  }

  static create = getControllerCreator(ListController);

  async tryCreate() {
    return super.tryCreate(
      {
        ownerId: this.user.id,
        isArchived: false,
      },
      {
        respondOne: async (list) => {
          await invitations.create({
            listId: list.id,
            inviterId: this.user.id,
            inviteeId: this.user.id,
            status: 'accepted',
          });

          this.respondOne(list);
        },
      }
    );
  }

  async tryListPaginated() {
    return this.tryAction(async () => {
      const invitedLists = await invitations.find({
        inviteeId: this.user.id,
        status: 'accepted',
      });

      const invitedListIds = invitedLists.map(invite => invite.listId);

      return super.tryListPaginated({
        isArchived: false,
        id: invitedListIds.length > 0 ? { $in: invitedListIds } : undefined,
      });
    });
  }

  async tryListArchived() {
    return this.tryAction(async () => {
      const invitedLists = await invitations.find({
        inviteeId: this.user.id,
        status: 'accepted',
      });

      const invitedListIds = invitedLists.map(invite => invite.listId);

      return super.tryListPaginated({
        id: invitedListIds.length > 0 ? { $in: invitedListIds } : undefined,
        ownerId: this.user.id,
        isArchived: true,
      });
    });
  }

  tryArchive() {
    return super.tryUpdate({ isArchived: true });
  }

  tryGetOne() {
    return this.tryAction(() => this.respondRequired('list'));
  }
}

const router = ExposedRouter('/v1/todo-lists');

router
  .get('/',
    // #swagger.summary = 'List all active todo lists'
    // #swagger.security = [{"bearerAuth": []}]

    auth.requireExposed,
    ListController.create(controller => controller.tryListPaginated()))

  .get('/archived',
    // #swagger.summary = 'List all archived todo lists'
    // #swagger.security = [{"bearerAuth": []}]

    auth.requireExposed,
    ListController.create(controller => controller.tryListArchived()))

  .get('/:id',
    // #swagger.summary = 'Get a specific todo list'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['id'] = { description: 'UUID of the todo list' }

    auth.requireExposed,
    validateListAccess,
    ListController.create(controller => controller.tryGetOne()))

  .post('/',
    // #swagger.summary = 'Create a new todo list'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.jsonBody = required|components/schemas/appModule/toDoLists/createList

    tryValidateBody(createListSchema),
    auth.requireExposed,
    ListController.create(controller => controller.tryCreate()))

  .patch('/:id/archive',
    // #swagger.summary = 'Archive a todo list'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['id'] = { description: 'UUID of the todo list' }

    auth.requireExposed,
    validateListAccess,
    ListController.create(controller => controller.tryArchive()));

export default router;