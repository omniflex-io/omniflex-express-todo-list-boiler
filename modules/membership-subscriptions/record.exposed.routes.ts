// #swagger.file.tags = ['Membership Records']
// #swagger.file.basePath = '/v1/membership'

import { auth } from '@/middlewares/auth';
import { ExposedRouter } from '@/servers';
import { BaseEntitiesController, getControllerCreator } from '@omniflex/infra-express';

import { membershipRecords, currentMemberships } from './membership.repo';
import { TMembershipRecord, TCurrentMembership } from './models';
import { MembershipService } from './membership.service';

const membershipService = new MembershipService();

class MembershipRecordController extends BaseEntitiesController<TMembershipRecord> {
  constructor(req, res, next) {
    super(req, res, next, membershipRecords);
  }

  static create = getControllerCreator(MembershipRecordController);

  tryListMy() {
    return this.tryAction(async () => {
      const result = await membershipService.listUserMemberships(this.user.id);
      this.respondMany(result.data, result.total);
    });
  }
}

class CurrentMembershipController extends BaseEntitiesController<TCurrentMembership> {
  constructor(req, res, next) {
    super(req, res, next, currentMemberships);
  }

  static create = getControllerCreator(CurrentMembershipController);

  tryGetMyCurrent() {
    return this.tryAction(async () => {
      const result = await membershipService.getCurrentMembership(this.user.id);
      this.respondOne(result);
    });
  }

  tryGetUserCurrent() {
    return this.tryAction(async () => {
      const result = await membershipService.getCurrentMembership(this.req.params.userId);
      this.respondOne(result);
    });
  }
}

const router = ExposedRouter('/v1/membership');

router.get('/records/my',
  // #swagger.summary = 'List user membership records'
  // #swagger.security = [{"bearerAuth": []}]
  auth.requireExposed,
  MembershipRecordController.create(controller => controller.tryListMy()));

router.get('/records/my/current',
  // #swagger.summary = 'Get user current membership'
  // #swagger.security = [{"bearerAuth": []}]
  auth.requireExposed,
  CurrentMembershipController.create(controller => controller.tryGetMyCurrent()));