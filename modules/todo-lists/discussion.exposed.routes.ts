// #swagger.file.tags = ['Todo Lists Discussions']
// #swagger.file.basePath = '/v1/todo-lists'

import { auth } from '@/middlewares/auth';
import { ExposedRouter } from '@/servers';

import { TDiscussion } from './models';
import { discussions, items, messages } from './todo.repo';
import {
  validateItemAccess,
  validateDiscussionAccess,
  byItemId,
} from './middlewares';

import {
  getControllerCreator,
  BaseEntitiesController,
} from '@omniflex/infra-express';

class DiscussionController extends BaseEntitiesController<TDiscussion> {
  constructor(req, res, next) {
    super(req, res, next, discussions);
  }

  static create = getControllerCreator(DiscussionController);

  async tryGetOrCreate() {
    return this.tryAction(async () => {
      const { item } = this.res.locals.required;

      const discussion = await this.repository.findOne({ itemId: item.id });
      if (discussion) {
        return this.respondOne(discussion);
      }

      return this.tryCreate({ itemId: item.id });
    });
  }

  async tryGetMessages() {
    return this.tryAction(async () => {
      const { id } = this.req.params;
      const discussion = await this.repository.findOne({ id });
      if (!discussion) {
        return this.respondMany([]);
      }

      const item = await items.findOne({ id: discussion.itemId });
      if (!item) {
        return this.respondMany([]);
      }

      const messageList = await messages.find({ discussionId: id });
      return this.respondMany(messageList);
    });
  }
}

const router = ExposedRouter('/v1/todo-lists');

router
  .get('/:listId/items/:itemId/discussion',
    // #swagger.summary = 'Get or create discussion for an item'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['itemId'] = { description: 'UUID of the todo item' }

    auth.requireExposed,
    validateItemAccess,
    byItemId,
    DiscussionController.create(controller => controller.tryGetOrCreate()))

  .get('/discussions/:id/messages',
    // #swagger.summary = 'Get all messages in a discussion'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['id'] = { description: 'UUID of the discussion' }

    auth.requireExposed,
    validateDiscussionAccess,
    DiscussionController.create(controller => controller.tryGetMessages()));

export default router; 