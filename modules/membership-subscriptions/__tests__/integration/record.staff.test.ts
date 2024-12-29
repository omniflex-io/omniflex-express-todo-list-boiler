import { Express } from 'express';
import { v4 as uuid } from 'uuid';
import { Containers } from '@omniflex/core';
import { AutoServer } from '@omniflex/infra-express';

import '../../record.staff.routes';
import { initializeDatabase } from '../../models';
import { membershipLevels } from '../../membership.repo';

import {
  createTestUser,
  createTestLevel,
  createTestMembershipRecord,
  createTestMembershipRecordData,
  resetTestData,
  expectMembershipRecordResponse,
  expectListResponse,
  expectResponseData,
} from '../helpers/setup';
import {
  expect200,
  expect401,
  expect400,
  expect404,
} from '../helpers/request';

describe('Membership Record Staff Integration Tests', () => {
  const sequelize = Containers.appContainer.resolve('sequelize');

  let app: Express;
  let staffUser: { id: string; token: string };
  let normalUser: { id: string; token: string };
  let defaultLevel: { id: string };

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
    defaultLevel = await membershipLevels.findOne({ isDefault: true });
  });

  afterAll(async () => {
    await sequelize.close();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  beforeEach(async () => {
    await sequelize.sync({ force: true });
    await initializeDatabase();
    await new Promise(resolve => setTimeout(resolve, 100));
    defaultLevel = await membershipLevels.findOne({ isDefault: true });
  });

  afterEach(async () => {
    await resetTestData();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('GET /v1/membership/records', () => {
    const url = '/v1/membership/records';

    it('[STAFF-R0010] should list all membership records', async () => {
      const premiumLevel = await createTestLevel(2);
      const record1 = await createTestMembershipRecord(uuid(), defaultLevel.id);
      const record2 = await createTestMembershipRecord(uuid(), premiumLevel.id);

      const response = await expect200(() => app).get(url, staffUser.token);

      expectListResponse(response, 2, [
        { id: record1.id, membershipLevelId: defaultLevel.id },
        { id: record2.id, membershipLevelId: premiumLevel.id },
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

      const response = await expect200(() => app).get(
        `${url}?userId=${targetUserId}`,
        staffUser.token,
      );

      expectListResponse(response, 2, [
        { id: record1.id, userId: targetUserId, membershipLevelId: defaultLevel.id },
        { id: record2.id, userId: targetUserId, membershipLevelId: premiumLevel.id },
      ]);
    });

    it('[STAFF-R0020] should require staff auth', async () => {
      await expect401(() => app).get(url, normalUser.token);
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

      const response = await expect200(() => app).post(
        url,
        recordData,
        staffUser.token,
      );

      const data = expectResponseData(response, recordData);
      expectMembershipRecordResponse(data);
    });

    it('[STAFF-R0040] should require staff auth', async () => {
      const recordData = createTestMembershipRecordData(uuid(), defaultLevel.id);

      await expect401(() => app).post(
        url,
        recordData,
        normalUser.token,
      );
    });

    it('[STAFF-R0050] should validate membership level exists', async () => {
      const recordData = createTestMembershipRecordData(uuid(), uuid());

      await expect404(() => app).post(
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

      await expect400(() => app).post(
        url,
        recordData,
        staffUser.token,
      );
    });
  });

  describe('GET /v1/membership/records/:recordId', () => {
    const getUrl = (recordId: string) => `/v1/membership/records/${recordId}`;

    it('[STAFF-R0070] should get membership record by ID', async () => {
      const userId = uuid();
      const record = await createTestMembershipRecord(userId, defaultLevel.id);

      const response = await expect200(() => app).get(
        getUrl(record.id),
        staffUser.token,
      );

      const data = expectResponseData(response, {
        id: record.id,
        userId,
        membershipLevelId: defaultLevel.id,
      });
      expectMembershipRecordResponse(data);
    });

    it('[STAFF-R0080] should require staff auth', async () => {
      const record = await createTestMembershipRecord(uuid(), defaultLevel.id);

      await expect401(() => app).get(
        getUrl(record.id),
        normalUser.token,
      );
    });

    it('[STAFF-R0090] should return 404 for non-existent record', async () => {
      await expect404(() => app).get(getUrl(uuid()), staffUser.token);
    });
  });

  describe('PATCH /v1/membership/records/:recordId', () => {
    const getUrl = (recordId: string) => `/v1/membership/records/${recordId}`;

    it('[STAFF-R0100] should update membership record', async () => {
      const premiumLevel = await createTestLevel(2);
      const record = await createTestMembershipRecord(uuid(), defaultLevel.id);
      const newStartAtUtc = new Date('2024-02-01T00:00:00Z');
      const newEndBeforeUtc = new Date('2025-02-01T00:00:00Z');

      const updateData = {
        membershipLevelId: premiumLevel.id,
        startAtUtc: newStartAtUtc.toISOString(),
        endBeforeUtc: newEndBeforeUtc.toISOString(),
      };

      const response = await expect200(() => app).patch(
        getUrl(record.id),
        updateData,
        staffUser.token,
      );

      const data = expectResponseData(response, updateData);
      expectMembershipRecordResponse(data);
    });

    it('[STAFF-R0110] should require staff auth', async () => {
      const record = await createTestMembershipRecord(uuid(), defaultLevel.id);
      const updateData = { startAtUtc: new Date().toISOString() };

      await expect401(() => app).patch(
        getUrl(record.id),
        updateData,
        normalUser.token,
      );
    });

    it('[STAFF-R0120] should validate membership level exists when updating', async () => {
      const record = await createTestMembershipRecord(uuid(), defaultLevel.id);
      const updateData = { membershipLevelId: uuid() };

      await expect404(() => app).patch(
        getUrl(record.id),
        updateData,
        staffUser.token,
      );
    });

    it('[STAFF-R0130] should validate end date is after start date when updating', async () => {
      const record = await createTestMembershipRecord(uuid(), defaultLevel.id);
      const startAtUtc = new Date('2024-01-01T00:00:00Z');
      const endBeforeUtc = new Date('2023-01-01T00:00:00Z');

      const updateData = createTestMembershipRecordData(
        record.userId,
        record.membershipLevelId,
        startAtUtc,
        endBeforeUtc,
      );

      await expect400(() => app).patch(
        getUrl(record.id),
        updateData,
        staffUser.token,
      );
    });

    it('[STAFF-R0140] should return 404 for non-existent record', async () => {
      const updateData = { startAtUtc: new Date().toISOString() };

      await expect404(() => app).patch(
        getUrl(uuid()),
        updateData,
        staffUser.token,
      );
    });
  });
}); 