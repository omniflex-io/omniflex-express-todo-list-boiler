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

      const response = await expect200(() => app).post(
        url,
        {
          userId,
          membershipLevelId: defaultLevel.id,
          startAtUtc,
          endBeforeUtc,
        },
        staffUser.token,
      );

      const data = expectResponseData(response, {
        userId,
        membershipLevelId: defaultLevel.id,
        startAtUtc: startAtUtc.toISOString(),
        endBeforeUtc: endBeforeUtc.toISOString(),
      });
      expectMembershipRecordResponse(data);
    });

    it('[STAFF-R0040] should require staff auth', async () => {
      await expect401(() => app).post(
        url,
        {
          userId: uuid(),
          membershipLevelId: defaultLevel.id,
          startAtUtc: new Date(),
          endBeforeUtc: new Date('9999-12-31T23:59:59Z'),
        },
        normalUser.token,
      );
    });

    it('[STAFF-R0050] should validate membership level exists', async () => {
      await expect404(() => app).post(
        url,
        {
          userId: uuid(),
          membershipLevelId: uuid(),
          startAtUtc: new Date(),
          endBeforeUtc: new Date('9999-12-31T23:59:59Z'),
        },
        staffUser.token,
      );
    });

    it('[STAFF-R0060] should validate end date is after start date', async () => {
      const startAtUtc = new Date('2024-01-01T00:00:00Z');
      const endBeforeUtc = new Date('2023-01-01T00:00:00Z');

      await expect400(() => app).post(
        url,
        {
          userId: uuid(),
          membershipLevelId: defaultLevel.id,
          startAtUtc,
          endBeforeUtc,
        },
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

      const response = await expect200(() => app).patch(
        getUrl(record.id),
        {
          membershipLevelId: premiumLevel.id,
          startAtUtc: newStartAtUtc,
          endBeforeUtc: newEndBeforeUtc,
        },
        staffUser.token,
      );

      const data = expectResponseData(response, {
        id: record.id,
        membershipLevelId: premiumLevel.id,
        startAtUtc: newStartAtUtc.toISOString(),
        endBeforeUtc: newEndBeforeUtc.toISOString(),
      });
      expectMembershipRecordResponse(data);
    });

    it('[STAFF-R0110] should require staff auth', async () => {
      const record = await createTestMembershipRecord(uuid(), defaultLevel.id);

      await expect401(() => app).patch(
        getUrl(record.id),
        {
          startAtUtc: new Date(),
        },
        normalUser.token,
      );
    });

    it('[STAFF-R0120] should validate membership level exists when updating', async () => {
      const record = await createTestMembershipRecord(uuid(), defaultLevel.id);

      await expect404(() => app).patch(
        getUrl(record.id),
        {
          membershipLevelId: uuid(),
        },
        staffUser.token,
      );
    });

    it('[STAFF-R0130] should validate end date is after start date when updating', async () => {
      const record = await createTestMembershipRecord(uuid(), defaultLevel.id);
      const startAtUtc = new Date('2024-01-01T00:00:00Z');
      const endBeforeUtc = new Date('2023-01-01T00:00:00Z');

      await expect400(() => app).patch(
        getUrl(record.id),
        {
          startAtUtc,
          endBeforeUtc,
        },
        staffUser.token,
      );
    });

    it('[STAFF-R0140] should return 404 for non-existent record', async () => {
      await expect404(() => app).patch(
        getUrl(uuid()),
        {
          startAtUtc: new Date(),
        },
        staffUser.token,
      );
    });
  });
}); 