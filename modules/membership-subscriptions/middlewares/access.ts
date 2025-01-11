import { RequiredDbEntries } from '@omniflex/infra-express';
import { errors } from '@omniflex/core';
import { Request, Response, NextFunction } from 'express';

import { membershipLevels, membershipRecords } from '../membership.repo';

export const byLevelId = RequiredDbEntries.byPathId(membershipLevels, 'level', { fieldName: 'levelId' });
export const byRecordId = RequiredDbEntries.byPathId(membershipRecords, 'record', { fieldName: 'recordId' });

export const validateUniqueMembershipCode = RequiredDbEntries.ensureNotExists(
  membershipLevels,
  (req) => ({
    code: req.body.code,
    deletedAt: null,
  }),
  {
    existsMessage: 'Membership level code must be unique',
  },
);

export const validateUniqueMembershipRank = RequiredDbEntries.ensureNotExists(
  membershipLevels,
  (req) => ({
    rank: req.body.rank,
    deletedAt: null,
  }),
  {
    existsMessage: 'Membership level rank must be unique',
  },
);

export const validateMembershipLevelExists = async (
  req: Request,
  _: Response,
  next: NextFunction,
) => {
  try {
    if (!req.body.membershipLevelId) {
      return next();
    }

    const level = await membershipLevels.findOne({
      id: req.body.membershipLevelId,
      deletedAt: null,
    });

    if (!level) {
      throw errors.notFound('Membership level not found');
    }

    next();
  } catch (error) {
    next(error);
  }
};