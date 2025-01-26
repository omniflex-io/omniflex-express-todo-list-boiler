import { ExpressUtils } from '@omniflex/infra-express';
import { auth } from '@/middlewares/auth';
import { validateProfile } from '@/modules/user-identities/middlewares/access';
import { MembershipService } from '../membership.service';

export const requireProfileWithMembership = [
  auth.requireExposed,
  validateProfile,

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