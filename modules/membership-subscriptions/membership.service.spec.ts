import { membershipLevels, membershipRecords, currentMemberships } from './membership.repo';
import { MembershipService } from './membership.service';
import { TMembershipLevel, TMembershipRecord, TCurrentMembership } from './models';

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
    create: jest.fn(),
    updateById: jest.fn(),
  },
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
});