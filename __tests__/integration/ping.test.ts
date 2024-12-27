import request from 'supertest';
import { Express } from 'express';
import { AutoServer } from '@omniflex/infra-express';
import { Server } from 'http';

describe('Ping Integration Tests', () => {
  let app: Express;
  let server: Server;

  beforeAll(async () => {
    AutoServer.addServer({ type: 'exposed', port: 3500 });
    const router = AutoServer.getOrCreateRouter('exposed', '/v1');
    router.get('/ping', (_, res) => { res.json({ data: 'pong' }); });
    const [exposedServer] = await AutoServer.start();
    app = exposedServer.app;
    server = exposedServer.server!;
  });

  afterAll(async () => {
    if (server?.close) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  });

  describe('GET /v1/ping', () => {
    it('should return 200 with pong message', async () => {
      const response = await request(app)
        .get('/v1/ping')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toBe('pong');
    });
  });
});