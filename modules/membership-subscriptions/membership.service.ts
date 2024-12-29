import { membershipLevels, membershipRecords, currentMemberships } from './membership.repo';
import { resolve } from '@omniflex/module-identity-core';
import { TUserProfile } from '@omniflex/module-identity-core/types';
import { IUserProfileRepository } from '@omniflex/module-identity-core/types';

interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

type TUserProfileWithMembership = Omit<TUserProfile, 'deletedAt'> & {
  membership: NonNullable<Awaited<ReturnType<typeof currentMemberships.findOne>>>;
};

export class MembershipService {
  private readonly userProfiles: IUserProfileRepository;

  constructor() {
    const { profiles } = resolve();
    this.userProfiles = profiles;
  }

  async listUserMemberships(userId: string) {
    const records = await membershipRecords.findAll({
      userId,
      deletedAt: null,
    });

    return { data: records, total: records.length };
  }

  async getOrCreateDefaultMembership(userId: string) {
    const defaultLevel = await membershipLevels.findOne({
      isDefault: true,
      deletedAt: null,
    });

    if (!defaultLevel) {
      throw new Error('Default membership level not found');
    }

    const now = new Date();
    const maxDate = new Date('9999-12-31T23:59:59Z');

    const defaultRecord = await membershipRecords.create({
      userId,
      membershipLevelId: defaultLevel.id,
      startAtUtc: now,
      endBeforeUtc: maxDate,
    });

    const newCurrent = await currentMemberships.create({
      userId,
      membershipLevelId: defaultLevel.id,
      membershipRecordId: defaultRecord.id,
    });

    return currentMemberships.findById(newCurrent.id);
  }

  async getCurrentMembership(userId: string) {
    const current = await currentMemberships.findOne({
      userId,
      deletedAt: null,
    });

    if (!current) {
      return this.getOrCreateDefaultMembership(userId);
    }

    return current;
  }

  async getCurrentMemberships(userIds: string[], options?: PaginationOptions) {
    const [memberships, profiles, total] = await Promise.all([
      currentMemberships.find({
        userId: { $in: userIds },
        deletedAt: null,
      }, {
        ...(options && {
          skip: ((options.page || 1) - 1) * (options.pageSize || 10),
          take: options.pageSize || 10,
        }),
        sort: { userId: 'asc' },
      }),
      this.userProfiles.find({
        userId: { $in: userIds },
        deletedAt: null,
      }),
      currentMemberships.count({
        userId: { $in: userIds },
        deletedAt: null,
      }),
    ]);

    const profileMap = new Map(profiles.map(profile => [profile.userId, profile]));
    const data = memberships
      .map(membership => {
        const profile = profileMap.get(membership.userId);
        if (!profile || !membership) return null;

        // eslint-disable-next-line unused-imports/no-unused-vars
        const { deletedAt, ...profileWithoutDeleted } = profile;
        return {
          ...profileWithoutDeleted,
          membership,
        };
      })
      .filter((item): item is TUserProfileWithMembership => item !== null);

    return { data, total };
  }
}