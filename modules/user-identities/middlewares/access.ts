import { RequiredDbEntries, ExpressUtils } from '@omniflex/infra-express';
import { MembershipService } from '@/modules/membership-subscriptions/membership.service';
import { resolve } from '@omniflex/module-identity-core';
import { auth } from '@/middlewares/auth';

const { profiles } = resolve();

const validateProfileWithMembership = RequiredDbEntries.firstMatch(
  profiles,
  (_, res) => ({ userId: res.locals.user.id }),
  'profile',
);

export const requireProfileWithMembership = [
  auth.requireExposed,
  validateProfileWithMembership,
  ExpressUtils.tryAction(async (_, res) => {
    const profile = res.locals.required.profile;
    const membershipService = new MembershipService();
    const membership = await membershipService.getCurrentMembership(profile.userId);

    // eslint-disable-next-line unused-imports/no-unused-vars
    const { deletedAt, ...profileWithoutDeleted } = profile;
    res.locals.required.profileWithMembership = {
      ...profileWithoutDeleted,
      membership,
    };
  }),
];