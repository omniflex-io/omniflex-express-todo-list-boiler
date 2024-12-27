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
    super(req, res, next, items);
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

  tryList() {
    return this.tryAction(async () => {
      const { list } = this.res.locals.required;
      return super.tryList({ listId: list.id });
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
    ItemController.create(controller => controller.tryList()))

  .get('/:listId/items/:id',
    // #swagger.summary = 'Get a specific todo item'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }
    // #swagger.parameters['id'] = { description: 'UUID of the todo item' }

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

  .patch('/:listId/items/:id',
    // #swagger.summary = 'Update a todo item content'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }
    // #swagger.parameters['id'] = { description: 'UUID of the todo item' }
    // #swagger.jsonBody = required|components/schemas/appModule/toDoLists/updateItem

    tryValidateBody(updateItemSchema),
    auth.requireExposed,
    validateItemAccess,
    ItemController.create(controller => controller.tryUpdateContent()))

  .post('/:listId/items/:id/complete',
    // #swagger.summary = 'Mark a todo item as completed'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }
    // #swagger.parameters['id'] = { description: 'UUID of the todo item' }

    auth.requireExposed,
    validateItemAccess,
    ItemController.create(controller => controller.tryComplete()))

  .post('/:listId/items/:id/uncomplete',
    // #swagger.summary = 'Mark a todo item as uncompleted'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['listId'] = { description: 'UUID of the todo list' }
    // #swagger.parameters['id'] = { description: 'UUID of the todo item' }

    auth.requireExposed,
    validateItemAccess,
    ItemController.create(controller => controller.tryUncomplete()));

export default router;