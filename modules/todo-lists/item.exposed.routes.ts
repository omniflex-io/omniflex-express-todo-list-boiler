// #swagger.file.tags = ['Todo Lists Items']
// #swagger.file.basePath = '/v1/todo-lists'

import { auth } from '@/middlewares/auth';
import { ExposedRouter } from '@/servers';
import { tryValidateBody } from '@omniflex/infra-express/helpers/joi';

import { TItem } from './models';
import { items } from './todo.repo';
import { validateItemAccess } from './middlewares';
import {
  createItemSchema,
  updateItemSchema,
} from './http.schemas';

import {
  getControllerCreator,
  BaseEntitiesController,
} from '@omniflex/infra-express';

class ItemController extends BaseEntitiesController<TItem> {
  constructor(req, res, next) {
    super(req, res, next, items, { idParamName: 'itemId' });
  }

  static create = getControllerCreator(ItemController);

  tryCreate() {
    return this.tryAction(async () => {
      const { list } = this.res.locals.required;

      return super.tryCreate({
        listId: list.id,
        isCompleted: false,
      });
    });
  }

  tryListAll() {
    return this.tryAction(async () => {
      const { list } = this.res.locals.required;
      return super.tryListAll({ listId: list.id });
    });
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
      completedAt: null,
      completedBy: null,
    });
  }
}

const router = ExposedRouter('/v1/todo-lists');

router
  .get('/:listId/items',
    // #swagger.summary = 'List all todo items in a list'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }

    auth.requireExposed,
    validateItemAccess,
    ItemController.create(controller => controller.tryListAll()))

  .get('/:listId/items/:itemId',
    // #swagger.summary = 'Get a specific todo item'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }
    // #swagger.parameters['itemId'] = { description: 'UUID of the todo item' }

    auth.requireExposed,
    validateItemAccess,
    ItemController.create(controller => controller.tryGetOne()))

  .post('/:listId/items',
    // #swagger.summary = 'Create a new todo item'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }
    // #swagger.jsonBody = required|components/schemas/appModule/toDoLists/createItem

    tryValidateBody(createItemSchema),
    auth.requireExposed,
    validateItemAccess,
    ItemController.create(controller => controller.tryCreate()))

  .patch('/:listId/items/:itemId',
    // #swagger.summary = 'Update a todo item'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }
    // #swagger.parameters['itemId'] = { description: 'UUID of the todo item' }
    // #swagger.jsonBody = required|components/schemas/appModule/toDoLists/updateItem

    tryValidateBody(updateItemSchema),
    auth.requireExposed,
    validateItemAccess,
    ItemController.create(controller => controller.tryUpdateContent()))

  .patch('/:listId/items/:itemId/complete',
    // #swagger.summary = 'Mark a todo item as completed'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }
    // #swagger.parameters['itemId'] = { description: 'UUID of the todo item' }

    auth.requireExposed,
    validateItemAccess,
    ItemController.create(controller => controller.tryComplete()))

  .patch('/:listId/items/:itemId/uncomplete',
    // #swagger.summary = 'Mark a todo item as not completed'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }
    // #swagger.parameters['itemId'] = { description: 'UUID of the todo item' }

    auth.requireExposed,
    validateItemAccess,
    ItemController.create(controller => controller.tryUncomplete()));

export default router;