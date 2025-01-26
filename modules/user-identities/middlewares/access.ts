import { RequiredDbEntries } from '@omniflex/infra-express';
import { resolve } from '@omniflex/module-identity-core';
import { auth } from '@/middlewares/auth';

const { profiles } = resolve();

export const validateProfile = RequiredDbEntries.firstMatch(
  profiles,
  (_, res) => ({ userId: res.locals.user.id }),
  'profile',
);

export const requireProfile = [
  auth.requireExposed,
  validateProfile,
];