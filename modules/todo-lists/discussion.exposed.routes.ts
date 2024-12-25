// #swagger.file.tags = ['Todo Lists Discussions']
// #swagger.file.basePath = '/v1/todo-lists'

import { auth } from '@/middlewares/auth';
import { ExposedRouter } from '@/servers';

import { TDiscussion, TMessage } from './models';
import { discussions, items, messages } from './todo.repo';
import { validateItemAccess, validateDiscussionAccess } from './middlewares';

import {
  RequiredDbEntries,
  getControllerCreator,
  BaseEntitiesController,
} from '@omniflex/infra-express';

class DiscussionController extends BaseEntitiesController<TDiscussion> {
  constructor(req, res, next) {
    super(req, res, next, discussions);
  }

  static create = getControllerCreator(DiscussionController);

  async tryGetOrCreate() {
    const { itemId } = this.req.params;
    let discussion = await discussions.findOne({ itemId });

    if (!discussion) {
      discussion = await discussions.create({ itemId });
    }

    return discussion;
  }

  async tryGetMessages() {
    return this.tryAction(async () => {
      const { id } = this.req.params;
      const discussion = await discussions.findOne({ id });
      if (!discussion) return [];

      const item = await items.findOne({ id: discussion.itemId });
      if (!item) return [];

      return messages.find({ discussionId: id });
    });
  }
}

const byItemId = RequiredDbEntries.byPathId(items, 'item');

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