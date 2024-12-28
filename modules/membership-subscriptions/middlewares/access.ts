import { RequiredDbEntries } from '@omniflex/infra-express';
import { errors } from '@omniflex/core';
import { Request, Response, NextFunction } from 'express';

import { membershipLevels } from '../membership.repo';

export const byLevelId = RequiredDbEntries.byPathId(membershipLevels, 'level', { fieldName: 'levelId' });

export const validateUniqueMembershipCode = async (
  req: Request,
  _: Response,
  next: NextFunction,
) => {
  try {
    const existing = await membershipLevels.findOne({
      code: req.body.code,
      deletedAt: null,
    });
    if (existing) {
      throw errors.badRequest('Membership level code must be unique');
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const validateUniqueMembershipRank = async (
  req: Request,
  _: Response,
  next: NextFunction,
) => {
  try {
    const existing = await membershipLevels.findOne({
      rank: req.body.rank,
      deletedAt: null,
    });
    if (existing) {
      throw errors.badRequest('Membership level rank must be unique');
    }
    next();
  } catch (error) {
    next(error);
  }
};