import Joi from 'joi';
import j2s from 'joi-to-swagger';

import { TMembershipLevel, TMembershipRecord } from './models';
import { modulesSchemas } from '@omniflex/core';

export const createMembershipLevelSchema = Joi.object<Pick<TMembershipLevel, 'code' | 'name' | 'rank' | 'isDefault'>>({
  code: Joi.string().required(),
  name: Joi.string().required(),
  rank: Joi.number().integer().min(0).required(),
  isDefault: Joi.boolean().default(false),
});

export const createMembershipRecordSchema = Joi.object<Pick<TMembershipRecord, 'userId' | 'membershipLevelId' | 'startAtUtc' | 'endBeforeUtc'>>({
  userId: Joi.string().required(),
  membershipLevelId: Joi.string().required(),
  startAtUtc: Joi.date().iso().required(),
  endBeforeUtc: Joi.date().iso().greater(Joi.ref('startAtUtc')).required(),
});

export const updateMembershipRecordSchema = Joi.object<Partial<Pick<TMembershipRecord, 'membershipLevelId' | 'startAtUtc' | 'endBeforeUtc'>>>({
  membershipLevelId: Joi.string(),
  startAtUtc: Joi.date().iso(),
  endBeforeUtc: Joi.date().iso().greater(Joi.ref('startAtUtc')),
});

modulesSchemas.appModule = Object.assign(
  modulesSchemas.appModule || {},
  {
    membership: {
      createMembershipLevel: {
        ...j2s(createMembershipLevelSchema).swagger,
        example: {
          code: 'PREMIUM',
          name: 'Premium Membership',
          rank: 10,
          isDefault: false,
        },
      },
      createMembershipRecord: {
        ...j2s(createMembershipRecordSchema).swagger,
        example: {
          userId: '00000000-0000-0000-0000-000000000000',
          membershipLevelId: '00000000-0000-0000-0000-000000000000',
          startAtUtc: '2024-01-01T00:00:00Z',
          endBeforeUtc: '2025-01-01T00:00:00Z',
        },
      },
      updateMembershipRecord: {
        ...j2s(updateMembershipRecordSchema).swagger,
        example: {
          membershipLevelId: '00000000-0000-0000-0000-000000000000',
          startAtUtc: '2024-01-01T00:00:00Z',
          endBeforeUtc: '2025-01-01T00:00:00Z',
        },
      },
    },
  },
);