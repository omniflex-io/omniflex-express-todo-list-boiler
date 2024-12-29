// #swagger.tags = ['Membership']
// #swagger.basePath = '/v1/membership'

import { auth } from '@/middlewares/auth';
import { StaffRouter } from '@/servers';
import { tryValidateBody } from '@omniflex/infra-express/helpers/joi';
import { getControllerCreator, BaseEntitiesController } from '@omniflex/infra-express';
import { Request, Response, NextFunction } from 'express';

import { membershipRecords } from './membership.repo';
import { TMembershipRecord } from './models';
import { createMembershipRecordSchema, updateMembershipRecordSchema } from './http.schemas';
import { byRecordId, validateMembershipLevelExists } from './middlewares/access';
import { MembershipService } from './membership.service';

const membershipService = new MembershipService();

class MembershipRecordController extends BaseEntitiesController<TMembershipRecord> {
  constructor(req: Request, res: Response, next: NextFunction) {
    super(req, res, next, membershipRecords, { idParamName: 'recordId' });
  }

  static create = getControllerCreator(MembershipRecordController);

  tryList() {
    return this.tryAction(async () => {
      const { userId } = this.req.query;
      const filter = userId ? { userId: userId as string } : {};

      const records = await this.repository.find(filter, {
        sort: { startAtUtc: 'desc' },
      });
      this.respondMany(records);
    });
  }

  tryGetOne() {
    return this.tryAction(() => this.respondRequired('record'));
  }

  tryGetUserCurrentMemberships() {
    return this.tryAction(async () => {
      const userIds = (this.req.query.userIds as string || '').split(',').filter(Boolean);
      if (!userIds.length) {
        return this.respondMany([]);
      }

      const options = {
        page: this.page,
        pageSize: this.pageSize,
      };

      const result = await membershipService.getCurrentMemberships(userIds, options);
      return this.respondMany(result.data, result.total);
    });
  }
}

const router = StaffRouter('/v1/membership');

router
  .get('/records',
    // #swagger.summary = 'List all membership records'
    // #swagger.security = [{ "bearerAuth": [] }]
    // #swagger.parameters['userId'] = { description: 'Filter records by user ID', type: 'string' }
    // #swagger.parameters['page'] = { description: 'Page number (1-based)', type: 'integer', default: 1 }
    // #swagger.parameters['pageSize'] = { description: 'Number of items per page', type: 'integer', default: 10 }
    auth.requireStaff,
    MembershipRecordController.create(controller => controller.tryList()))

  .get('/records/current-memberships',
    // #swagger.summary = 'Get current memberships with user profiles for multiple users'
    // #swagger.security = [{ "bearerAuth": [] }]
    // #swagger.parameters['userIds'] = { type: 'string', required: true, example: 'user-uuid-1,user-uuid-2,user-uuid-3' }
    // #swagger.parameters['page'] = { description: 'Page number (1-based)', type: 'integer' }
    // #swagger.parameters['pageSize'] = { description: 'Number of items per page', type: 'integer' }
    auth.requireStaff,
    MembershipRecordController.create(controller => controller.tryGetUserCurrentMemberships()))

  .post('/records',
    // #swagger.summary = 'Create a new membership record'
    // #swagger.security = [{ "bearerAuth": [] }]
    // #swagger.jsonBody = required|components/schemas/appModule/membership/createMembershipRecord
    auth.requireStaff,
    tryValidateBody(createMembershipRecordSchema),
    validateMembershipLevelExists,
    MembershipRecordController.create(controller => controller.tryCreate()))

  .get('/records/:recordId',
    // #swagger.summary = 'Get a membership record by ID'
    // #swagger.security = [{ "bearerAuth": [] }]
    // #swagger.parameters['recordId'] = { description: 'UUID of the membership record' }
    auth.requireStaff,
    byRecordId,
    MembershipRecordController.create(controller => controller.tryGetOne()))

  .patch('/records/:recordId',
    // #swagger.summary = 'Update a membership record'
    // #swagger.security = [{ "bearerAuth": [] }]
    // #swagger.parameters['recordId'] = { description: 'UUID of the membership record' }
    // #swagger.jsonBody = required|components/schemas/appModule/membership/updateMembershipRecord
    auth.requireStaff,
    byRecordId,
    tryValidateBody(updateMembershipRecordSchema),
    validateMembershipLevelExists,
    MembershipRecordController.create(controller => controller.tryUpdate()));