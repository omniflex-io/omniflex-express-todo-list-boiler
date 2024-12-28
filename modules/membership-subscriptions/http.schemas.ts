import Joi from 'joi';
import j2s from 'joi-to-swagger';

import { TMembershipLevel } from './models';
import { modulesSchemas } from '@omniflex/core';

export const createMembershipLevelSchema = Joi.object<Pick<TMembershipLevel, 'code' | 'name' | 'rank' | 'isDefault'>>({
  code: Joi.string().required(),
  name: Joi.string().required(),
  rank: Joi.number().integer().min(0).required(),
  isDefault: Joi.boolean().default(false),
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
    },
  },
);