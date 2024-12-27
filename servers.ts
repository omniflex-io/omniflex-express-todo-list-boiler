import config from '@/config';
import { auth } from '@/middlewares/auth';
import { skipSwaggerStaticLogger } from '@/middlewares/swagger-logger';
import { AutoServer } from '@omniflex/infra-express';

export const servers = [
  { type: 'exposed', port: 3500 },
  { type: 'staff', port: 3600 },
  { type: 'developer', port: 3700 },
]
  .filter(({ type }) => !config.isTesting || type == 'exposed')
  .map(server => ({ ...server, noServer: config.isTesting }));

export const [
  ExposedRouter,
  StaffRouter,
  DeveloperRouter,
] = servers.map(({ type, ...rest }) => {
  const beforeMiddlewares = [auth.optional];

  if (type === 'developer') {
    beforeMiddlewares.unshift(skipSwaggerStaticLogger);
  }

  AutoServer.addServer({
    ...rest,
    type,
    options: {
      middlewares: {
        before: beforeMiddlewares,
      },
    },
  });

  return (path: string) => AutoServer.getOrCreateRouter(type, path);
});

// -- http://localhost:3500/v1/ping
ExposedRouter('/v1')
  .get('/ping/', (_, res) => { res.json({ data: 'pong' }); });

if (!config.isTesting) {
  // -- http://localhost:3600/v1/ping
  StaffRouter('/v1')
    .get('/ping/', (_, res) => { res.json({ data: 'pong' }); });

  // -- http://localhost:3700/v1/ping
  DeveloperRouter('/v1')
    .get('/ping/', (_, res) => { res.json({ data: 'pong' }); });
}