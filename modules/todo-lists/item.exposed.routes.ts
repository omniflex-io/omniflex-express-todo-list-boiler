// #swagger.file.tags = ['Todo Lists Items']
// #swagger.file.basePath = '/v1/todo-lists'

import { auth } from '@/middlewares/auth';
import { ExposedRouter } from '@/servers';
import { tryValidateBody } from '@omniflex/infra-express/helpers/joi';

import { TItem } from './models';
import { items, lists } from './todo.repo';
import { validateItemAccess } from './middlewares';
import {
  createItemSchema,
  updateItemSchema,
} from './http.schemas';

import {
  RequiredDbEntries,
  getControllerCreator,
  BaseEntitiesController,
} from '@omniflex/infra-express';

class ItemController extends BaseEntitiesController<TItem> {
  constructor(req, res, next) {
    super(req, res, next, items);
  }

  static create = getControllerCreator(ItemController);

  tryCreate() {
    const { listId } = this.req.params;
    return super.tryCreate({
      listId,
      isCompleted: false,
    });
  }

  tryListPaginated() {
    const { listId } = this.req.params;
    return super.tryListPaginated({ listId });
  }

  tryUpdateContent() {
    return super.tryUpdate();
  }

  tryComplete() {
    return super.tryUpdate({
      isCompleted: true,
      completedAt: new Date(),
      completedBy: this.user.id,
    });
  }

  tryUncomplete() {
    return super.tryUpdate({
      isCompleted: false,
      completedAt: undefined,
      completedBy: undefined,
    });
  }

  tryGetOne() {
    return this.tryAction(() => this.respondRequired('item'));
  }
}

const byListId = RequiredDbEntries.byId(lists, req => req.params.listId, true);

const byItemIdOfList = [
  byListId,
  RequiredDbEntries.firstMatch(items, req => ({
    id: req.params.id,
    listId: req.params.listId,
  }), 'item'),
];

const router = ExposedRouter('/v1/todo-lists');

router
  .get('/:listId/items',
    // #swagger.summary = 'List all todo items in a list'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }

    auth.requireExposed,
    validateItemAccess,
    byListId,
    ItemController.create(controller => controller.tryListPaginated()))

  .get('/:listId/items/:id',
    // #swagger.summary = 'Get a specific todo item'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }
    // #swagger.parameters['id'] = { description: 'UUID of the todo item' }

    auth.requireExposed,
    validateItemAccess,
    byItemIdOfList,
    ItemController.create(controller => controller.tryGetOne()))

  .post('/:listId/items',
    // #swagger.summary = 'Create a new todo item'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }
    // #swagger.jsonBody = required|components/schemas/appModule/toDoLists/createItem

    tryValidateBody(createItemSchema),
    auth.requireExposed,
    validateItemAccess,
    byListId,
    ItemController.create(controller => controller.tryCreate()))

  .patch('/:listId/items/:id',
    // #swagger.summary = 'Update a todo item content'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }
    // #swagger.parameters['id'] = { description: 'UUID of the todo item' }
    // #swagger.jsonBody = required|components/schemas/appModule/toDoLists/updateItem

    tryValidateBody(updateItemSchema),
    auth.requireExposed,
    validateItemAccess,
    byItemIdOfList,
    ItemController.create(controller => controller.tryUpdateContent()))

  .post('/:listId/items/:id/complete',
    // #swagger.summary = 'Mark a todo item as completed'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }
    // #swagger.parameters['id'] = { description: 'UUID of the todo item' }

    auth.requireExposed,
    validateItemAccess,
    byItemIdOfList,
    ItemController.create(controller => controller.tryComplete()))

  .post('/:listId/items/:id/uncomplete',
    // #swagger.summary = 'Mark a todo item as uncompleted'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }
    // #swagger.parameters['id'] = { description: 'UUID of the todo item' }

    auth.requireExposed,
    validateItemAccess,
    byItemIdOfList,
    ItemController.create(controller => controller.tryUncomplete()));

export default router;