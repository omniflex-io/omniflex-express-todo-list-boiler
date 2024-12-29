import { Sequelize } from 'sequelize';
import { Containers } from '@omniflex/core';
import * as Types from '@omniflex/infra-sequelize-v6/types';

export type TMembershipLevel = {
  id: string
  code: string
  name: string
  rank: number
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export type TMembershipRecord = {
  id: string
  userId: string
  membershipLevelId: string
  startAtUtc: Date
  endBeforeUtc: Date
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export type TCurrentMembership = {
  id: string
  userId: string
  membershipLevelId: string
  membershipRecordId: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

const membershipLevelSchema = {
  id: Types.id('UUID'),
  code: Types.requiredString(),
  name: Types.requiredString(),
  rank: Types.requiredInteger(),
  isDefault: Types.requiredBoolean(),
  createdAt: Types.requiredDate(),
  updatedAt: Types.requiredDate(),
};

const membershipRecordSchema = {
  id: Types.id('UUID'),
  userId: Types.requiredString(),
  membershipLevelId: Types.requiredString(),
  startAtUtc: Types.requiredDate(),
  endBeforeUtc: Types.requiredDate(),
  createdAt: Types.requiredDate(),
  updatedAt: Types.requiredDate(),
};

const currentMembershipSchema = {
  id: Types.id('UUID'),
  userId: Types.requiredString(),
  membershipLevelId: Types.requiredString(),
  membershipRecordId: Types.requiredString(),
  createdAt: Types.requiredDate(),
  updatedAt: Types.requiredDate(),
};

const sequelize = Containers
  .appContainerAs<{ sequelize: Sequelize; }>()
  .resolve('sequelize');

export const MembershipLevelModel = sequelize.define('MembershipLevel', membershipLevelSchema, {
  paranoid: true,
  indexes: [
    { fields: ['code'], unique: true },
    { fields: ['rank'] },
  ],
});

export const MembershipRecordModel = sequelize.define('MembershipRecord', membershipRecordSchema, {
  paranoid: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['membershipLevelId'] },
    { fields: ['startAtUtc'] },
    { fields: ['endBeforeUtc'] },
  ],
});

export const CurrentMembershipModel = sequelize.define('CurrentMembership', currentMembershipSchema, {
  paranoid: true,
  indexes: [
    { fields: ['userId'], unique: true },
    { fields: ['membershipLevelId'] },
    { fields: ['membershipRecordId'] },
  ],
});

MembershipRecordModel.belongsTo(MembershipLevelModel, { foreignKey: 'membershipLevelId', as: 'membershipLevel' });
MembershipLevelModel.hasMany(MembershipRecordModel, { foreignKey: 'membershipLevelId', as: 'membershipRecords' });

CurrentMembershipModel.belongsTo(MembershipLevelModel, { foreignKey: 'membershipLevelId', as: 'membershipLevel' });
MembershipLevelModel.hasMany(CurrentMembershipModel, { foreignKey: 'membershipLevelId', as: 'currentMemberships' });

CurrentMembershipModel.belongsTo(MembershipRecordModel, { foreignKey: 'membershipRecordId', as: 'membershipRecord' });

export const initializeDatabase = async () => {
  try {
    await sequelize.sync();
    await MembershipLevelModel.findOrCreate({
      where: { code: 'BASIC' },
      defaults: {
        name: 'Basic Membership',
        code: 'BASIC',
        rank: 0,
        isDefault: true,
      },
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
};