// #swagger.file.tags = ['Todo Lists Messages']
// #swagger.file.basePath = '/v1/todo-lists'

import { auth } from '@/middlewares/auth';
import { ExposedRouter } from '@/servers';
import { tryValidateBody } from '@omniflex/infra-express/helpers/joi';

import { TMessage } from './models';
import { messages } from './todo.repo';
import { createMessageSchema } from './http.schemas';
import {
  validateDiscussionMemberAccess,
} from './middlewares';

import {
  getControllerCreator,
  BaseEntitiesController,
} from '@omniflex/infra-express';

class MessageController extends BaseEntitiesController<TMessage> {
  constructor(req, res, next) {
    super(req, res, next, messages, { idParamName: 'messageId' });
  }

  static create = getControllerCreator(MessageController);

  tryCreate() {
    return this.tryAction(async () => {
      const { discussion } = this.res.locals.required;
      return super.tryCreate({
        discussionId: discussion.id,
        senderId: this.user.id,
        ...this.req.body,
      });
    });
  }

  tryListAll() {
    return this.tryAction(async () => {
      const { discussion } = this.res.locals.required;
      return super.tryListAll({ discussionId: discussion.id });
    });
  }
}

const router = ExposedRouter('/v1/todo-lists');

router
  .post('/discussions/:discussionId/messages',
    // #swagger.summary = 'Create a new message in a discussion'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['discussionId'] = { description: 'UUID of the discussion' }
    // #swagger.jsonBody = required|components/schemas/appModule/toDoLists/createMessage

    tryValidateBody(createMessageSchema),
    auth.requireExposed,
    validateDiscussionMemberAccess,
    MessageController.create(controller => controller.tryCreate()));

export default router;