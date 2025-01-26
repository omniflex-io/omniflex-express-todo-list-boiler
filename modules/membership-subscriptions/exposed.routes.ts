// -- modules/membership-subscriptions/exposed.routes.ts
// #swagger.file.tags = ['Identity']
// #swagger.file.basePath = '/v1'

import { ExposedRouter } from '@/servers';
import { getControllerCreator } from '@omniflex/infra-express';
import { Controllers } from '@omniflex/module-identity-express';
import { requireProfileWithMembership } from './middlewares/profile';

class Controller extends Controllers.UsersController {
  static create = getControllerCreator(Controller);

  tryGetProfileWithMembership() {
    return this.tryAction(() => this.respondRequired('profileWithMembership'));
  }
}

const router = ExposedRouter('/v1');

router
  .get('/users/me', // #swagger.summary = 'Get current user profile with membership'
    // #swagger.security = [{ "bearerAuth": [] }]
    requireProfileWithMembership,
    Controller.create(controller => controller.tryGetProfileWithMembership()),
  );