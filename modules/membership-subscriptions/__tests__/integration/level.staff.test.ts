import { Express } from 'express';
import { v4 as uuid } from 'uuid';
import { Containers } from '@omniflex/core';
import { AutoServer } from '@omniflex/infra-express';

// Import route handlers
import '../../level.staff.routes';
import { initializeDatabase } from '../../models';
import { membershipLevels } from '../../membership.repo';

// Import test helpers
import {
  createTestUser,
  createTestLevel,
  resetTestData,
  expectMembershipLevelResponse,
  expectListResponse,
  expectResponseData,
} from '../helpers/setup';
import {
  expect200,
  expect401,
  expect400,
  expect404,
} from '../helpers/request';

describe('Membership Staff Integration Tests', () => {
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

  describe('GET /v1/membership/levels', () => {
    const url = '/v1/membership/levels';

    it('[STAFF-L0010] should list all membership levels', async () => {
      const premiumLevel = await createTestLevel(2);
      const proLevel = await createTestLevel(3);

      const response = await expect200(() => app).get(url, staffUser.token);

      expectListResponse(response, 3, [
        { id: defaultLevel.id, rank: 0, isDefault: true },
        { id: premiumLevel.id, rank: 2 },
        { id: proLevel.id, rank: 3 },
      ]);
    });

    it('[STAFF-L0020] should require staff auth', async () => {
      await expect401(() => app).get(url, normalUser.token);
    });
  });

  describe('POST /v1/membership/levels', () => {
    const url = '/v1/membership/levels';

    it('[STAFF-L0030] should create a new membership level', async () => {
      const response = await expect200(() => app).post(
        url,
        {
          name: 'Premium',
          code: 'PREMIUM',
          rank: 2,
          isDefault: false,
        },
        staffUser.token,
      );

      const data = expectResponseData(response, {
        name: 'Premium',
        code: 'PREMIUM',
        rank: 2,
        isDefault: false,
      });
      expectMembershipLevelResponse(data);
    });

    it('[STAFF-L0040] should require staff auth', async () => {
      await expect401(() => app).post(
        url,
        {
          name: 'Premium',
          code: 'PREMIUM',
          rank: 2,
          isDefault: false,
        },
        normalUser.token,
      );
    });

    it('[STAFF-L0050] should validate unique code', async () => {
      await createTestLevel(2, false, 'PREMIUM');

      await expect400(() => app).post(
        url,
        {
          name: 'Premium Plus',
          code: 'PREMIUM',
          rank: 3,
          isDefault: false,
        },
        staffUser.token,
      );
    });

    it('[STAFF-L0060] should validate unique rank', async () => {
      await createTestLevel(2);

      await expect400(() => app).post(
        url,
        {
          name: 'Premium Plus',
          code: 'PREMIUM_PLUS',
          rank: 2,
          isDefault: false,
        },
        staffUser.token,
      );
    });

    it('[STAFF-L0070] should not allow creating default level if one exists', async () => {
      await expect400(() => app).post(
        url,
        {
          name: 'Basic Plus',
          code: 'BASIC_PLUS',
          rank: 0,
          isDefault: true,
        },
        staffUser.token,
      );
    });
  });

  describe('GET /v1/membership/levels/:levelId', () => {
    const getUrl = (levelId: string) => `/v1/membership/levels/${levelId}`;

    it('[STAFF-L0080] should get membership level by ID', async () => {
      const premiumLevel = await createTestLevel(2);

      const response = await expect200(() => app).get(
        getUrl(premiumLevel.id),
        staffUser.token,
      );

      const data = expectResponseData(response, {
        id: premiumLevel.id,
        rank: 2,
      });
      expectMembershipLevelResponse(data);
    });

    it('[STAFF-L0090] should require staff auth', async () => {
      const premiumLevel = await createTestLevel(2);

      await expect401(() => app).get(
        getUrl(premiumLevel.id),
        normalUser.token,
      );
    });

    it('[STAFF-L0100] should return 404 for non-existent level', async () => {
      await expect404(() => app).get(getUrl(uuid()), staffUser.token);
    });
  });
});