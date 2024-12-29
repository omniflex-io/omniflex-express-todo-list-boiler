// -- modules/user-identities/exposed.routes.ts
// #swagger.file.tags = ['Identity']
// #swagger.file.basePath = '/v1'

import ms from 'ms';
import config from '@/config';
import { v4 as uuid } from 'uuid';
import { jwtProvider } from '@/utils/jwt';

import { ExposedRouter } from '@/servers';
import { getControllerCreator } from '@omniflex/infra-express';

import {
  TUser,
  TBodyLoginWithEmail,
  TBodyRegisterWithEmail,
} from '@omniflex/module-identity-core';

import {
  UsersController,
  validateLoginWithEmail,
  validateRegisterWithEmail,
} from '@omniflex/module-identity-express';

import { requireProfileWithMembership } from './middlewares/access';

class Controller extends UsersController {
  static create = getControllerCreator(Controller);

  private get _appType() {
    return this.res.locals.appType;
  }

  tryRegister() {
    type TBody = TBodyRegisterWithEmail;

    this.tryActionWithBody<TBody>(async ({ password, ...body }) => {
      const user = await this.register(this._appType, password, {
        ...body,
        username: body.email,
      });

      return this.respondOne(user);
    });
  }

  tryLoginWithEmail() {
    type TBody = TBodyLoginWithEmail;

    this.tryActionWithBody<TBody>(async (body) => {
      const user = await this.login(this._appType, {
        ...body,
        username: body.email,
      });

      return this.respondOne({
        accessToken: await this._getAccessToken(user),
      });
    });
  }

  tryGetProfileWithMembership() {
    return this.tryAction(() => this.respondRequired('profileWithMembership'));
  }

  private async _getAccessToken(user: TUser) {
    const expiresIn = config.jwt.expiresIn;
    const expiredInMs = typeof expiresIn === 'string' ?
      ms(expiresIn) : expiresIn * 1000;

    return await jwtProvider.sign(
      {
        ...user,

        __identifier: uuid(),
        __type: 'access-token',
        __appType: this._appType,
      },
      expiredInMs,
    );
  }
}

const router = ExposedRouter('/v1');

router
  .post('/users',  // #swagger.summary = 'Register a new user'
    // #swagger.jsonBody = required|components/schemas/moduleIdentity/registerWithEmail
    validateRegisterWithEmail,
    Controller.create(controller => controller.tryRegister()),
  )

  .post('/access-tokens', // #swagger.summary = 'Login with email'
    // #swagger.jsonBody = required|components/schemas/moduleIdentity/loginWithEmail
    validateLoginWithEmail,
    Controller.create(controller => controller.tryLoginWithEmail()),
  )

  .get('/users/me', // #swagger.summary = 'Get current user profile with membership'
    // #swagger.security = [{ "bearerAuth": [] }]
    requireProfileWithMembership,
    Controller.create(controller => controller.tryGetProfileWithMembership()),
  );