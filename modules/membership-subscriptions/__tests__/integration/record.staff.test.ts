import { Express } from 'express';
import { v4 as uuid } from 'uuid';
import { Containers } from '@omniflex/core';
import { AutoServer } from '@omniflex/infra-express';

// Import route handlers
import '../../record.staff.routes';
import { initializeDatabase } from '../../models';
import { membershipLevels, membershipRecords, currentMemberships } from '../../membership.repo';
import { TMembershipLevel } from '../../models';

// Import test helpers
import {
  createTestUser,
  createTestLevel,
  createTestMembershipRecord,
  createTestMembershipRecordData,
  resetTestData,
  expectMembershipRecordResponse,
  expectListResponse,
  expectResponseData,
  createTestUserProfile,
} from '../helpers/setup';
import { RequestHelper } from '../helpers/request';

describe('Membership Record Staff Integration Tests', () => {
  const sequelize = Containers.appContainer.resolve('sequelize');
  const expect200 = new RequestHelper(() => app, 200);
  const expect401 = new RequestHelper(() => app, 401);
  const expect400 = new RequestHelper(() => app, 400);
  const expect404 = new RequestHelper(() => app, 404);

  let app: Express;
  let staffUser: { id: string; token: string; };
  let normalUser: { id: string; token: string; };
  let defaultLevel: TMembershipLevel;

  beforeAll(async () => {
    if (!app) {
      app = (await AutoServer.start())
        .find(({ type }) => type === 'staff')!
        .app;
    }

    await sequelize.sync({ force: true });
    await initializeDatabase();

    staffUser = await createTestUser('staff');
    normalUser = await createTestUser('exposed');
    const level = await membershipLevels.findOne({ isDefault: true });
    if (!level) throw new Error('Default level not found');
    defaultLevel = level;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await sequelize.sync({ force: true });
    await initializeDatabase();
    const level = await membershipLevels.findOne({ isDefault: true });
    if (!level) throw new Error('Default level not found');
    defaultLevel = level;
  });

  afterEach(async () => {
    await resetTestData();
  });

  describe('GET /v1/membership/records', () => {
    const url = '/v1/membership/records';

    it('[STAFF-R0010] should list all membership records', async () => {
      const premiumLevel = await createTestLevel(2);
      const record1 = await createTestMembershipRecord(staffUser.id, defaultLevel.id);
      const record2 = await createTestMembershipRecord(normalUser.id, premiumLevel.id);

      const response = await expect200.get(url, staffUser.token);

      expectListResponse(response, 2, [
        { id: record1.id, userId: staffUser.id, membershipLevelId: defaultLevel.id },
        { id: record2.id, userId: normalUser.id, membershipLevelId: premiumLevel.id },
      ]);
    });

    it('[STAFF-R0015] should filter records by user', async () => {
      const premiumLevel = await createTestLevel(2);
      const targetUserId = uuid();
      const otherUserId = uuid();

      // Create records for target user
      const record1 = await createTestMembershipRecord(targetUserId, defaultLevel.id);
      const record2 = await createTestMembershipRecord(targetUserId, premiumLevel.id);

      // Create records for other user
      await createTestMembershipRecord(otherUserId, defaultLevel.id);
      await createTestMembershipRecord(otherUserId, premiumLevel.id);

      const response = await expect200.get(
        `${url}?userId=${targetUserId}`,
        staffUser.token,
      );

      expectListResponse(response, 2, [
        { id: record1.id, userId: targetUserId, membershipLevelId: defaultLevel.id },
        { id: record2.id, userId: targetUserId, membershipLevelId: premiumLevel.id },
      ]);
    });

    it('[STAFF-R0020] should require staff auth', async () => {
      await expect401.get(url, normalUser.token);
    });
  });

  describe('POST /v1/membership/records', () => {
    const url = '/v1/membership/records';

    it('[STAFF-R0030] should create a new membership record', async () => {
      const userId = uuid();
      const startAtUtc = new Date('2024-01-01T00:00:00Z');
      const endBeforeUtc = new Date('2025-01-01T00:00:00Z');

      const recordData = createTestMembershipRecordData(
        userId,
        defaultLevel.id,
        startAtUtc,
        endBeforeUtc,
      );

      const response = await expect200.post(
        url,
        recordData,
        staffUser.token,
      );

      const data = expectResponseData(response, recordData);
      expectMembershipRecordResponse(data);
    });

    it('[STAFF-R0035] should update current membership when creating a new record', async () => {
      const userId = uuid();
      const premiumLevel = await createTestLevel(2);

      // Create an old record
      const oldRecord = await createTestMembershipRecord(
        userId,
        defaultLevel.id,
        new Date('2023-01-01T00:00:00Z'),
        new Date('2023-12-31T23:59:59Z'),
      );

      // Create a new record
      const newRecordData = createTestMembershipRecordData(
        userId,
        premiumLevel.id,
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-12-31T23:59:59Z'),
      );

      const response = await expect200.post(
        url,
        newRecordData,
        staffUser.token,
      );

      const data = expectResponseData(response, newRecordData);
      expectMembershipRecordResponse(data);

      // Verify the current membership is pointing to the new record
      const currentMembership = await currentMemberships.findOne({ userId });
      expect(currentMembership?.membershipRecordId).toBe(data.id);
      expect(currentMembership?.membershipLevelId).toBe(premiumLevel.id);

      // Verify old record still exists
      const updatedOldRecord = await membershipRecords.findById(oldRecord.id);
      expect(updatedOldRecord).toBeTruthy();
    });

    it('[STAFF-R0040] should require staff auth', async () => {
      const recordData = createTestMembershipRecordData(uuid(), defaultLevel.id);

      await expect401.post(
        url,
        recordData,
        normalUser.token,
      );
    });

    it('[STAFF-R0050] should validate membership level exists', async () => {
      const recordData = createTestMembershipRecordData(uuid(), uuid());

      await expect404.post(
        url,
        recordData,
        staffUser.token,
      );
    });

    it('[STAFF-R0060] should validate end date is after start date', async () => {
      const startAtUtc = new Date('2024-01-01T00:00:00Z');
      const endBeforeUtc = new Date('2023-01-01T00:00:00Z');

      const recordData = createTestMembershipRecordData(
        uuid(),
        defaultLevel.id,
        startAtUtc,
        endBeforeUtc,
      );

      await expect400.post(
        url,
        recordData,
        staffUser.token,
      );
    });
  });

  describe('GET /v1/membership/records/:recordId', () => {
    const getUrl = (recordId: string) => `/v1/membership/records/${recordId}`;

    it('[STAFF-R0070] should get membership record by ID', async () => {
      const premiumLevel = await createTestLevel(2);
      const record = await createTestMembershipRecord(staffUser.id, premiumLevel.id);

      const response = await expect200.get(getUrl(record.id), staffUser.token);

      const data = expectResponseData(response, {
        id: record.id,
        userId: staffUser.id,
        membershipLevelId: premiumLevel.id,
      });
      expectMembershipRecordResponse(data);
    });

    it('[STAFF-R0080] should require staff auth', async () => {
      const record = await createTestMembershipRecord(staffUser.id, defaultLevel.id);

      await expect401.get(getUrl(record.id), normalUser.token);
    });

    it('[STAFF-R0090] should return 404 for non-existent record', async () => {
      await expect404.get(getUrl(uuid()), staffUser.token);
    });
  });

  describe('GET /v1/membership/records/current-memberships', () => {
    const url = '/v1/membership/records/current-memberships';

    it('[STAFF-R0150] should get current memberships for multiple users', async () => {
      const premiumLevel = await createTestLevel(2);
      const user1 = uuid();
      const user2 = uuid();
      const record1 = await createTestMembershipRecord(user1, premiumLevel.id);
      const record2 = await createTestMembershipRecord(user2, defaultLevel.id);
      await Promise.all([
        createTestUserProfile(user1),
        createTestUserProfile(user2),
      ]);

      const response = await expect200.get(
        `${url}?userIds=${user1},${user2}`,
        staffUser.token,
      );

      const data = expectResponseData<any[]>(response);
      expect(data).toHaveLength(2);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: user1,
            firstName: `Test ${user1.slice(0, 4)}`,
            lastName: 'User',
            email: `test-${user1.slice(0, 4)}@example.com`,
            membership: expect.objectContaining({
              userId: user1,
              membershipLevelId: premiumLevel.id,
              membershipRecordId: record1.id,
            }),
          }),
          expect.objectContaining({
            userId: user2,
            firstName: `Test ${user2.slice(0, 4)}`,
            lastName: 'User',
            email: `test-${user2.slice(0, 4)}@example.com`,
            membership: expect.objectContaining({
              userId: user2,
              membershipLevelId: defaultLevel.id,
              membershipRecordId: record2.id,
            }),
          }),
        ]),
      );
    });

    it('[STAFF-R0160] should return empty array for no user IDs', async () => {
      const response = await expect200.get(
        `${url}?userIds=`,
        staffUser.token,
      );

      expectListResponse(response, 0, []);
    });

    it('[STAFF-R0170] should support pagination', async () => {
      const users = Array.from({ length: 3 }, () => uuid()).sort();

      // Create users in sequence to ensure consistent order
      for (const userId of users) {
        await createTestUserProfile(userId);
        await createTestMembershipRecord(userId, defaultLevel.id);
      }

      const response = await expect200.get(
        `${url}?userIds=${users.join(',')}&page=2&pageSize=1`,
        staffUser.token,
      );

      const data = expectResponseData<any[]>(response);
      expect(data).toHaveLength(1);
      expect(response.body.total).toBe(3);
      expect(data[0]).toMatchObject({
        userId: users[1],
        firstName: `Test ${users[1].slice(0, 4)}`,
        lastName: 'User',
        email: `test-${users[1].slice(0, 4)}@example.com`,
        membership: {
          userId: users[1],
          membershipLevelId: defaultLevel.id,
        },
      });
    });

    it('[STAFF-R0180] should require staff auth', async () => {
      await expect401.get(
        `${url}?userIds=${uuid()}`,
        normalUser.token,
      );
    });
  });

  describe('PATCH /v1/membership/records/:recordId', () => {
    const getUrl = (recordId: string) => `/v1/membership/records/${recordId}`;

    it('[STAFF-R0100] should update membership record', async () => {
      const userId = uuid();
      const premiumLevel = await createTestLevel(2);
      const record = await createTestMembershipRecord(userId, defaultLevel.id);

      const updateData = {
        membershipLevelId: premiumLevel.id,
        startAtUtc: new Date('2024-02-01T00:00:00Z').toISOString(),
        endBeforeUtc: new Date('2024-12-31T23:59:59Z').toISOString(),
      };

      const response = await expect200.patch(
        getUrl(record.id),
        updateData,
        staffUser.token,
      );

      const { updatedAt, ...expectedData } = { ...record, ...updateData };
      const data = expectResponseData(response, expectedData);
      expectMembershipRecordResponse(data);
    });

    it('[STAFF-R0105] should update current membership when updating a record', async () => {
      const userId = uuid();
      const premiumLevel = await createTestLevel(2);

      // Create two records
      const oldRecord = await createTestMembershipRecord(
        userId,
        defaultLevel.id,
        new Date('2023-01-01T00:00:00Z'),
        new Date('2023-12-31T23:59:59Z'),
      );

      const currentRecord = await createTestMembershipRecord(
        userId,
        premiumLevel.id,
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-12-31T23:59:59Z'),
      );

      // Update the old record to overlap with current record
      const updateData = {
        endBeforeUtc: new Date('2024-06-30T23:59:59Z').toISOString(),
      };

      const response = await expect200.patch(
        getUrl(oldRecord.id),
        updateData,
        staffUser.token,
      );

      const { updatedAt, ...expectedData } = {
        ...oldRecord,
        endBeforeUtc: updateData.endBeforeUtc,
      };
      const data = expectResponseData(response, expectedData);
      expectMembershipRecordResponse(data);

      // Verify the current membership is still pointing to the current record
      const currentMembership = await currentMemberships.findOne({ userId });
      expect(currentMembership?.membershipRecordId).toBe(currentRecord.id);
      expect(currentMembership?.membershipLevelId).toBe(premiumLevel.id);

      // Verify old record is updated
      const updatedOldRecord = await membershipRecords.findById(oldRecord.id);
      expect(updatedOldRecord?.endBeforeUtc.toISOString()).toBe(updateData.endBeforeUtc);
    });

    it('[STAFF-R0110] should require staff auth', async () => {
      const record = await createTestMembershipRecord(normalUser.id, defaultLevel.id);
      await expect401.patch(
        getUrl(record.id),
        { membershipLevelId: defaultLevel.id },
        normalUser.token,
      );
    });

    it('[STAFF-R0120] should validate membership level exists', async () => {
      const record = await createTestMembershipRecord(normalUser.id, defaultLevel.id);
      await expect404.patch(
        getUrl(record.id),
        { membershipLevelId: uuid() },
        staffUser.token,
      );
    });

    it('[STAFF-R0130] should validate end date is after start date', async () => {
      const record = await createTestMembershipRecord(normalUser.id, defaultLevel.id);
      await expect400.patch(
        getUrl(record.id),
        {
          startAtUtc: new Date('2024-02-01T00:00:00Z').toISOString(),
          endBeforeUtc: new Date('2024-01-01T00:00:00Z').toISOString(),
        },
        staffUser.token,
      );
    });

    it('[STAFF-R0140] should return 404 for non-existent record', async () => {
      const updateData = { startAtUtc: new Date().toISOString() };

      await expect404.patch(
        getUrl(uuid()),
        updateData,
        staffUser.token,
      );
    });
  });
});