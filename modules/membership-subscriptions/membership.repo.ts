import { SequelizeRepository } from '@omniflex/infra-sequelize-v6';
import { TDeepPartial, TQueryOptions } from '@omniflex/core/types/repository';

import {
  MembershipLevelModel,
  MembershipRecordModel,
  CurrentMembershipModel,
  TMembershipLevel,
  TMembershipRecord,
  TCurrentMembership,
} from './models';

export class MembershipLevelRepository extends SequelizeRepository<TMembershipLevel> {
  constructor() {
    super(MembershipLevelModel);
  }

  async findOne(filter: TDeepPartial<TMembershipLevel>, options?: TQueryOptions<TMembershipLevel>): Promise<TMembershipLevel | null> {
    const result = await MembershipLevelModel.findOne({
      where: filter,
      ...options,
    });
    return result?.toJSON() as TMembershipLevel | null;
  }
}

export class MembershipRecordRepository extends SequelizeRepository<TMembershipRecord> {
  constructor() {
    super(MembershipRecordModel);
  }

  async findAll(filter: TDeepPartial<TMembershipRecord>, options?: TQueryOptions<TMembershipRecord>): Promise<TMembershipRecord[]> {
    const result = await MembershipRecordModel.findAll({
      where: filter,
      ...options,
      include: [{
        model: MembershipLevelModel,
        as: 'membershipLevel',
      }],
    });
    return result.map(record => record.toJSON() as TMembershipRecord);
  }
}

export class CurrentMembershipRepository extends SequelizeRepository<TCurrentMembership> {
  constructor() {
    super(CurrentMembershipModel);
  }

  async findAll(filter: TDeepPartial<TCurrentMembership>, options?: TQueryOptions<TCurrentMembership>): Promise<TCurrentMembership[]> {
    const result = await CurrentMembershipModel.findAll({
      where: filter,
      ...options,
      include: [{
        model: MembershipLevelModel,
        as: 'membershipLevel',
      }, {
        model: MembershipRecordModel,
        as: 'membershipRecord',
      }],
    });
    return result.map(record => record.toJSON() as TCurrentMembership);
  }

  async findOne(filter: TDeepPartial<TCurrentMembership>, options?: TQueryOptions<TCurrentMembership>): Promise<TCurrentMembership | null> {
    const result = await CurrentMembershipModel.findOne({
      where: filter,
      ...options,
      include: [{
        model: MembershipLevelModel,
        as: 'membershipLevel',
      }, {
        model: MembershipRecordModel,
        as: 'membershipRecord',
      }],
    });
    return result?.toJSON() as TCurrentMembership | null;
  }

  async findById(id: string, options?: TQueryOptions<TCurrentMembership>): Promise<TCurrentMembership | null> {
    const result = await CurrentMembershipModel.findByPk(id, {
      ...options,
      include: [{
        model: MembershipLevelModel,
        as: 'membershipLevel',
      }, {
        model: MembershipRecordModel,
        as: 'membershipRecord',
      }],
    });
    return result?.toJSON() as TCurrentMembership | null;
  }
}

export const membershipLevels = new MembershipLevelRepository();
export const membershipRecords = new MembershipRecordRepository();
export const currentMemberships = new CurrentMembershipRepository();