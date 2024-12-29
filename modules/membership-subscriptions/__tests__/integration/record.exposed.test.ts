import { Express } from 'express';
import { v4 as uuid } from 'uuid';
import { Containers } from '@omniflex/core';
import { AutoServer } from '@omniflex/infra-express';

// Import route handlers
import '../../record.exposed.routes';
import { initializeDatabase } from '../../models';
import { membershipLevels } from '../../membership.repo';
import { TMembershipLevel } from '../../models';

// Import test helpers
import {
  createTestUser,
  createTestLevel,
  createTestMembershipRecord,
  resetTestData,
  expectListResponse,
  expectResponseData,
} from '../helpers/setup';
import { RequestHelper } from '../helpers/request';

describe('Membership Record Exposed Integration Tests', () => {
  const sequelize = Containers.appContainer.resolve('sequelize');
  const expect200 = new RequestHelper(() => app, 200);
  const expect401 = new RequestHelper(() => app, 401);

  let app: Express;
  let exposedUser: { id: string; token: string; };
  let otherUser: { id: string; token: string; };
  let defaultLevel: TMembershipLevel;

  beforeAll(async () => {
    if (!app) {
      app = (await AutoServer.start())
        .find(({ type }) => type === 'exposed')!
        .app;
    }

    await sequelize.sync({ force: true });
    await initializeDatabase();

    exposedUser = await createTestUser('exposed');
    otherUser = await createTestUser('exposed');
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

  describe('GET /v1/membership/records/my', () => {
    const url = '/v1/membership/records/my';

    it('[EXPOSED-R0010] should list user membership records', async () => {
      const premiumLevel = await createTestLevel(2);
      const record1 = await createTestMembershipRecord(exposedUser.id, defaultLevel.id);
      const record2 = await createTestMembershipRecord(exposedUser.id, premiumLevel.id);
      await createTestMembershipRecord(otherUser.id, defaultLevel.id);

      const response = await expect200.get(url, exposedUser.token);

      expectListResponse(response, 2, [
        { id: record1.id, userId: exposedUser.id, membershipLevelId: defaultLevel.id },
        { id: record2.id, userId: exposedUser.id, membershipLevelId: premiumLevel.id },
      ]);
    });

    it('[EXPOSED-R0020] should require authentication', async () => {
      await expect401.get(url);
    });
  });

  describe('GET /v1/membership/records/my/current', () => {
    const url = '/v1/membership/records/my/current';

    it('[EXPOSED-R0030] should get current membership', async () => {
      const premiumLevel = await createTestLevel(2);
      const record = await createTestMembershipRecord(exposedUser.id, premiumLevel.id);

      const response = await expect200.get(url, exposedUser.token);

      const data = expectResponseData(response, {
        userId: exposedUser.id,
        membershipLevelId: premiumLevel.id,
        membershipRecordId: record.id,
      });
      expect(data.membershipLevel).toBeDefined();
      expect(data.membershipRecord).toBeDefined();
    });

    it('[EXPOSED-R0040] should create default membership if none exists', async () => {
      const response = await expect200.get(url, exposedUser.token);

      const data = expectResponseData(response, {
        userId: exposedUser.id,
        membershipLevelId: defaultLevel.id,
      });
      expect(data.membershipLevel).toBeDefined();
      expect(data.membershipRecord).toBeDefined();
      expect(data.membershipLevel.isDefault).toBe(true);
    });

    it('[EXPOSED-R0050] should require authentication', async () => {
      await expect401.get(url);
    });
  });
});