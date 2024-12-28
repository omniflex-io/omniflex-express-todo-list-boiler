// #swagger.file.tags = ['Membership']
// #swagger.file.basePath = '/v1/membership'

import { auth } from '@/middlewares/auth';
import { StaffRouter } from '@/servers';
import { tryValidateBody } from '@omniflex/infra-express/helpers/joi';
import { getControllerCreator, BaseEntitiesController } from '@omniflex/infra-express';
import { Request, Response, NextFunction } from 'express';

import { membershipLevels } from './membership.repo';
import { initializeDatabase } from './models';
import { TMembershipLevel } from './models';
import { createMembershipLevelSchema } from './http.schemas';
import {
  byLevelId,
  validateUniqueMembershipCode,
  validateUniqueMembershipRank,
} from './middlewares/access';

class MembershipLevelController extends BaseEntitiesController<TMembershipLevel> {
  constructor(req: Request, res: Response, next: NextFunction) {
    super(req, res, next, membershipLevels, { idParamName: 'levelId' });
  }

  static create = getControllerCreator(MembershipLevelController);

  tryList() {
    return this.tryAction(async () => {
      const levels = await this.repository.find({}, {
        sort: { rank: 'asc' },
      });
      this.respondMany(levels);
    });
  }

  tryCreate() {
    return this.tryAction(async () => {
      const level = await super.tryCreate(this.req.body);
      this.respondOne(level);
    });
  }

  tryGetOne() {
    return this.tryAction(() => this.respondRequired('level'));
  }
}

const router = StaffRouter('/v1/membership');

router
  .get('/levels',
    // #swagger.summary = 'List all membership levels'
    // #swagger.security = [{"bearerAuth": []}]
    auth.requireStaff,
    MembershipLevelController.create(controller => controller.tryList()))

  .post('/levels',
    // #swagger.summary = 'Create a new membership level'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.requestBody = { "$ref": "#/components/schemas/appModule/membership/createMembershipLevel" }
    auth.requireStaff,
    tryValidateBody(createMembershipLevelSchema),
    validateUniqueMembershipCode,
    validateUniqueMembershipRank,
    MembershipLevelController.create(controller => controller.tryCreate()))

  .get('/levels/:levelId',
    // #swagger.summary = 'Get a membership level by ID'
    // #swagger.security = [{"bearerAuth": []}]
    // #swagger.parameters['levelId'] = { description: 'UUID of the membership level' }
    auth.requireStaff,
    byLevelId,
    MembershipLevelController.create(controller => controller.tryGetOne()));

// Initialize database with basic membership level
initializeDatabase().catch(console.error);