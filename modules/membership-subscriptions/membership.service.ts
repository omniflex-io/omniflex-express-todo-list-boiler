import { membershipLevels, membershipRecords, currentMemberships } from './membership.repo';

export class MembershipService {
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
}