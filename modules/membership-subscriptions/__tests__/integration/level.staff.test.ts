import { Express } from 'express';
import { v4 as uuid } from 'uuid';
import { Containers } from '@omniflex/core';
import { AutoServer } from '@omniflex/infra-express';

// Import route handlers
import '../../level.staff.routes';
import { initializeDatabase } from '../../models';
import { membershipLevels } from '../../membership.repo';
import { TMembershipLevel } from '../../models';

// Import test helpers
import {
  createTestUser,
  createTestLevel,
  createTestLevelData,
  resetTestData,
  expectMembershipLevelResponse,
  expectListResponse,
  expectResponseData,
} from '../helpers/setup';
import { RequestHelper } from '../helpers/request';

describe('Membership Staff Integration Tests', () => {
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
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  beforeEach(async () => {
    await sequelize.sync({ force: true });
    await initializeDatabase();
    await new Promise(resolve => setTimeout(resolve, 100));
    const level = await membershipLevels.findOne({ isDefault: true });
    if (!level) throw new Error('Default level not found');
    defaultLevel = level;
  });

  afterEach(async () => {
    await resetTestData();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('GET /v1/membership/levels', () => {
    const url = '/v1/membership/levels';

    it('[STAFF-L0010] should list all membership levels', async () => {
      const premiumLevel = await createTestLevel(2);
      const proLevel = await createTestLevel(3);

      const response = await expect200.get(url, staffUser.token);

      expectListResponse(response, 3, [
        { id: defaultLevel.id, rank: 0, isDefault: true },
        { id: premiumLevel.id, rank: 2 },
        { id: proLevel.id, rank: 3 },
      ]);
    });

    it('[STAFF-L0020] should require staff auth', async () => {
      await expect401.get(url, normalUser.token);
    });
  });

  describe('POST /v1/membership/levels', () => {
    const url = '/v1/membership/levels';

    it('[STAFF-L0030] should create a new membership level', async () => {
      const levelData = createTestLevelData(2, false, 'PREMIUM');
      const response = await expect200
        .post(url, levelData, staffUser.token);

      const data = expectResponseData(response, levelData);
      expectMembershipLevelResponse(data);
    });

    it('[STAFF-L0040] should require staff auth', async () => {
      const levelData = createTestLevelData(2, false, 'PREMIUM');
      await expect401
        .post(url, levelData, normalUser.token);
    });

    it('[STAFF-L0050] should validate unique code', async () => {
      await createTestLevel(2, false, 'PREMIUM');
      const levelData = createTestLevelData(3, false, 'PREMIUM');

      await expect400
        .post(url, levelData, staffUser.token);
    });

    it('[STAFF-L0060] should validate unique rank', async () => {
      await createTestLevel(2);
      const levelData = createTestLevelData(2, false, 'PREMIUM_PLUS');

      await expect400
        .post(url, levelData, staffUser.token);
    });

    it('[STAFF-L0070] should not allow creating default level if one exists', async () => {
      const levelData = createTestLevelData(0, true, 'BASIC_PLUS');

      await expect400
        .post(url, levelData, staffUser.token);
    });
  });

  describe('GET /v1/membership/levels/:levelId', () => {
    const getUrl = (levelId: string) => `/v1/membership/levels/${levelId}`;

    it('[STAFF-L0080] should get membership level by ID', async () => {
      const premiumLevel = await createTestLevel(2);

      const response = await expect200
        .get(getUrl(premiumLevel.id), staffUser.token);

      const data = expectResponseData(response, {
        id: premiumLevel.id,
        rank: 2,
      });
      expectMembershipLevelResponse(data);
    });

    it('[STAFF-L0090] should require staff auth', async () => {
      const premiumLevel = await createTestLevel(2);

      await expect401
        .get(getUrl(premiumLevel.id), normalUser.token);
    });

    it('[STAFF-L0100] should return 404 for non-existent level', async () => {
      await expect404.get(getUrl(uuid()), staffUser.token);
    });
  });
});