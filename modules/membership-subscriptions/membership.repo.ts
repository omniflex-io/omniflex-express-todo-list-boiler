import { SequelizeRepository } from '@omniflex/infra-sequelize-v6';

import {
  MembershipLevelModel,
  MembershipRecordModel,
  CurrentMembershipModel,
} from './models';

export const membershipLevels = new SequelizeRepository(MembershipLevelModel);
export const membershipRecords = new SequelizeRepository(MembershipRecordModel);
export const currentMemberships = new SequelizeRepository(CurrentMembershipModel);