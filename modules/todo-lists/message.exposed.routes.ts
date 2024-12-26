// #swagger.file.tags = ['Todo Lists Messages']
// #swagger.file.basePath = '/v1/todo-lists'

import { auth } from '@/middlewares/auth';
import { ExposedRouter } from '@/servers';
import { tryValidateBody } from '@omniflex/infra-express/helpers/joi';

import { TMessage } from './models';
import { messages } from './todo.repo';
import { createMessageSchema } from './http.schemas';
import {
  validateDiscussionAccess,
  byDiscussionId,
} from './middlewares';

import {
  getControllerCreator,
  BaseEntitiesController,
} from '@omniflex/infra-express';

class MessageController extends BaseEntitiesController<TMessage> {
  constructor(req, res, next) {
    super(req, res, next, messages);
  }

  static create = getControllerCreator(MessageController);

  tryCreate() {
    return this.tryAction(async () => {
      const { discussion } = this.res.locals.required;
      return super.tryCreate({
        discussionId: discussion.id,
        senderId: this.user.id,
      });
    });
  }

  tryListPaginated() {
    return this.tryAction(async () => {
      const { discussion } = this.res.locals.required;
      return super.tryListPaginated({ discussionId: discussion.id });
    });
  }
}

const router = ExposedRouter('/v1/todo-lists');

router
  .post('/discussions/:id/messages',
    // #swagger.summary = 'Add a message to discussion'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['id'] = { description: 'UUID of the discussion' }
    // #swagger.jsonBody = required|components/schemas/appModule/toDoLists/createMessage

    tryValidateBody(createMessageSchema),
    auth.requireExposed,
    byDiscussionId,
    validateDiscussionAccess,
    MessageController.create(controller => controller.tryCreate()));

export default router; 