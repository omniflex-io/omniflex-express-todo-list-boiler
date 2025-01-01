// #swagger.file.tags = ['Todo Lists Discussions']
// #swagger.file.basePath = '/v1/todo-lists'

import { auth } from '@/middlewares/auth';
import { ExposedRouter } from '@/servers';

import { TDiscussion } from './models';
import { discussions, messages } from './todo.repo';
import {
  byItemId,
  validateItemAccess,
  validateDiscussionMemberAccess,
} from './middlewares';

import {
  getControllerCreator,
  BaseEntitiesController,
} from '@omniflex/infra-express';

class DiscussionController extends BaseEntitiesController<TDiscussion> {
  constructor(req, res, next) {
    super(req, res, next, discussions, { idParamName: 'discussionId' });
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
      const { discussion } = this.res.locals.required;
      const messageList = await messages.find({ discussionId: discussion.id });
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

  .get('/discussions/:discussionId/messages',
    // #swagger.summary = 'Get all messages in a discussion'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['discussionId'] = { description: 'UUID of the discussion' }

    auth.requireExposed,
    validateDiscussionMemberAccess,
    DiscussionController.create(controller => controller.tryGetMessages()));