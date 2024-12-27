import request from 'supertest';
import { Express } from 'express';
import { Server } from 'http';
import { Containers } from '@omniflex/core';
import { items } from '../../todo.repo';
import { AutoServer } from '@omniflex/infra-express';

// Mock JWT first because other imports might use it
jest.mock('@/utils/jwt', () => require('../helpers/jwt'));

// Import route handlers
import './../../item.exposed.routes';

// Import test helpers
import { createTestUser } from '../helpers/setup';

describe('Item Management Integration Tests', () => {
  const sequelize = Containers.appContainer.resolve('sequelize');

  let app: Express;
  let servers: Server[];
  let testUser: { id: string; token: string };

  beforeAll(async () => {
    if (!app) {
      const _servers = await AutoServer.start();
      const exposedServer = _servers.find(({ type }) => type === 'exposed')!;

      app = exposedServer.app;
      servers = _servers.map(({ server }) => server!).filter(Boolean);
    }

    testUser = await createTestUser();
    await sequelize.sync({ force: true });
  });

  afterAll(() => {
    for (const server of servers) {
      server.closeAllConnections();
      server.close();
    }
    sequelize.close();
  });

  // ... rest of the test cases ...
}); 