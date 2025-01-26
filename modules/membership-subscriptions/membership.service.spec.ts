import { membershipLevels, membershipRecords, currentMemberships } from './membership.repo';
import { MembershipService } from './membership.service';
import { TMembershipLevel, TMembershipRecord, TCurrentMembership } from './models';
import { TUserProfile, TUser } from '@omniflex/module-identity-core/types';

jest.mock('./membership.repo', () => ({
  membershipLevels: {
    findById: jest.fn(),
    findOne: jest.fn(),
  },
  membershipRecords: {
    find: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  },
  currentMemberships: {
    findOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
  },
}));

jest.mock('@omniflex/module-identity-core', () => ({
  resolve: () => ({
    profiles: {
      find: jest.fn(),
    },
  }),
}));

describe('MembershipService', () => {
  let service: MembershipService;
  const userId = 'test-user-id';
  const now = new Date();

  beforeEach(() => {
    service = new MembershipService();
    jest.clearAllMocks();
  });

  describe('refreshCurrentMembership', () => {
    const mockCurrentMembership: TCurrentMembership = {
      id: 'current-id',
      userId,
      membershipLevelId: 'level-1',
      membershipRecordId: 'record-1',
      createdAt: now,
      updatedAt: now,
    };

    const createMockRecord = (
      id: string,
      levelId: string,
      startAtUtc: Date,
      endBeforeUtc: Date
    ): TMembershipRecord => ({
      id,
      userId,
      membershipLevelId: levelId,
      startAtUtc,
      endBeforeUtc,
      createdAt: now,
      updatedAt: now,
    });

    const createMockLevel = (id: string, rank: number): TMembershipLevel => ({
      id,
      rank,
      code: `LEVEL-${id}`,
      name: `Level ${id}`,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    });

    const mockDefaultLevel: TMembershipLevel = {
      id: 'default-level',
      rank: 0,
      code: 'BASIC',
      name: 'Basic Membership',
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    };

    beforeEach(() => {
      // Mock default level for getOrCreateDefaultMembership
      jest.spyOn(membershipLevels, 'findOne')
        .mockResolvedValue(mockDefaultLevel);
      jest.spyOn(membershipRecords, 'create')
        .mockImplementation(async (data) => ({
          ...data,
          id: 'new-record-id',
          createdAt: now,
          updatedAt: now,
        } as TMembershipRecord));
      jest.spyOn(currentMemberships, 'create')
        .mockImplementation(async (data) => ({
          ...data,
          id: 'new-current-id',
          createdAt: now,
          updatedAt: now,
        } as TCurrentMembership));
    });

    it('[MEMB-R0010] should throw error when no records exist', async () => {
      jest.spyOn(membershipRecords, 'find').mockResolvedValue([]);
      jest.spyOn(currentMemberships, 'findOne').mockResolvedValue(mockCurrentMembership);

      await expect(service.refreshCurrentMembership(userId))
        .rejects
        .toThrow('No active membership records found');
    });

    it('[MEMB-R0020] should throw error when no current membership exists', async () => {
      jest.spyOn(membershipRecords, 'find').mockResolvedValue([
        createMockRecord('record-1', 'level-1', new Date(), new Date('9999-12-31')),
      ]);
      jest.spyOn(currentMemberships, 'findOne')
        .mockResolvedValueOnce(null) // First call for getCurrentMembership
        .mockResolvedValueOnce(mockCurrentMembership); // Second call after creating default

      await expect(service.refreshCurrentMembership(userId))
        .rejects
        .toThrow('No active membership records found');
    });

    it('[MEMB-R0030] should throw error when no active records exist', async () => {
      const futureStart = new Date(now.getTime() + 1000);

      jest.spyOn(membershipRecords, 'find').mockResolvedValue([
        createMockRecord('record-1', 'level-1', futureStart, new Date('9999-12-31')),
      ]);
      jest.spyOn(currentMemberships, 'findOne').mockResolvedValue(mockCurrentMembership);

      await expect(service.refreshCurrentMembership(userId))
        .rejects
        .toThrow('No active membership records found');
    });

    it('[MEMB-R0040] should update to highest rank active record', async () => {
      const pastStart = new Date(now.getTime() - 1000);
      const futureEnd = new Date(now.getTime() + 1000);

      const mockRecords = [
        createMockRecord('record-1', 'level-1', pastStart, futureEnd),
        createMockRecord('record-2', 'level-2', pastStart, futureEnd),
      ];

      const mockLevels = [
        createMockLevel('level-1', 1),
        createMockLevel('level-2', 2),
      ];

      jest.spyOn(membershipRecords, 'find').mockResolvedValue(mockRecords);
      jest.spyOn(currentMemberships, 'findOne').mockResolvedValue(mockCurrentMembership);
      jest.spyOn(membershipLevels, 'findById')
        .mockImplementation(async (id) => mockLevels.find(l => l.id === id) || null);

      await service.refreshCurrentMembership(userId);

      expect(currentMemberships.updateById).toHaveBeenCalledWith(
        mockCurrentMembership.id,
        {
          membershipLevelId: 'level-2',
          membershipRecordId: 'record-2',
        }
      );
    });

    it('[MEMB-R0050] should handle records with exact current timestamp', async () => {
      const mockRecords = [
        createMockRecord('record-1', 'level-1', now, new Date('9999-12-31')),
      ];

      const mockLevels = [createMockLevel('level-1', 1)];

      jest.spyOn(membershipRecords, 'find').mockResolvedValue(mockRecords);
      jest.spyOn(currentMemberships, 'findOne').mockResolvedValue(mockCurrentMembership);
      jest.spyOn(membershipLevels, 'findById')
        .mockImplementation(async (id) => mockLevels.find(l => l.id === id) || null);

      await service.refreshCurrentMembership(userId);

      expect(currentMemberships.updateById).toHaveBeenCalledWith(
        mockCurrentMembership.id,
        {
          membershipLevelId: 'level-1',
          membershipRecordId: 'record-1',
        }
      );
    });
  });

  describe('getCurrentMemberships', () => {
    const mockUser: TUser = {
      id: 'test-user-id',
      isVerified: true,
      identifier: 'test@example.com',
      lastSignInAtUtc: now,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const mockUserProfile: TUserProfile = {
      id: 'profile-1',
      userId: 'test-user-id',
      email: 'test@example.com',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      user: mockUser,
    };

    const mockCurrentMembership: TCurrentMembership = {
      id: 'current-id',
      userId: 'test-user-id',
      membershipLevelId: 'level-1',
      membershipRecordId: 'record-1',
      createdAt: now,
      updatedAt: now,
    };

    it('[MEMB-R0060] should return empty data when no memberships exist', async () => {
      jest.spyOn(currentMemberships, 'find').mockResolvedValue([]);
      jest.spyOn(currentMemberships, 'count').mockResolvedValue(0);
      jest.spyOn(service['userProfiles'], 'find').mockResolvedValue([]);

      const result = await service.getCurrentMemberships([userId]);

      expect(result).toEqual({ data: [], total: 0 });
      expect(currentMemberships.find).toHaveBeenCalledWith(
        { userId: { $in: [userId] } },
        { sort: { userId: 'asc' } }
      );
    });

    it('[MEMB-R0070] should return combined user profile and membership data', async () => {
      jest.spyOn(currentMemberships, 'find').mockResolvedValue([mockCurrentMembership]);
      jest.spyOn(currentMemberships, 'count').mockResolvedValue(1);
      jest.spyOn(service['userProfiles'], 'find').mockResolvedValue([mockUserProfile]);

      const result = await service.getCurrentMemberships([userId]);

      expect(result).toEqual({
        data: [{
          id: mockUserProfile.id,
          userId: mockUserProfile.userId,
          email: mockUserProfile.email,
          createdAt: mockUserProfile.createdAt,
          updatedAt: mockUserProfile.updatedAt,
          user: mockUser,
          membership: mockCurrentMembership,
        }],
        total: 1,
      });
    });

    it('[MEMB-R0080] should handle pagination correctly', async () => {
      const options = { page: 2, pageSize: 5 };
      jest.spyOn(currentMemberships, 'find').mockResolvedValue([mockCurrentMembership]);
      jest.spyOn(currentMemberships, 'count').mockResolvedValue(1);
      jest.spyOn(service['userProfiles'], 'find').mockResolvedValue([mockUserProfile]);

      await service.getCurrentMemberships([userId], options);

      expect(currentMemberships.find).toHaveBeenCalledWith(
        { userId: { $in: [userId] } },
        { sort: { userId: 'asc' }, take: 5, skip: 5 }
      );
    });

    it('[MEMB-R0090] should filter out profiles without memberships', async () => {
      const anotherUserId = 'another-user-id';
      const anotherProfile: TUserProfile = {
        ...mockUserProfile,
        id: 'profile-2',
        userId: anotherUserId,
        user: {
          ...mockUser,
          id: anotherUserId,
        },
      };

      jest.spyOn(currentMemberships, 'find').mockResolvedValue([mockCurrentMembership]);
      jest.spyOn(currentMemberships, 'count').mockResolvedValue(1);
      jest.spyOn(service['userProfiles'], 'find').mockResolvedValue([
        mockUserProfile,
        anotherProfile,
      ]);

      const result = await service.getCurrentMemberships([userId, anotherUserId]);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].userId).toBe(userId);
    });
  });
});