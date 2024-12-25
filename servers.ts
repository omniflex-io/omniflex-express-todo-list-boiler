import { auth } from '@/middlewares/auth';
import { AutoServer } from '@omniflex/infra-express';

export const servers = [
  { type: 'exposed', port: 3500 },
  { type: 'staff', port: 3600 },
  { type: 'developer', port: 3700 },
];

export const [
  ExposedRouter,
  StaffRouter,
  DeveloperRouter,
] = servers.map(({ type, port }) => {
  AutoServer.addServer({
    type,
    port,
    options: {
      middlewares: {
        before: [
          // -- we use optional to every route, in reality,
          // -- the frontend will send the token in the header for most cases
          // -- regardless of the route requirements, with the optional auth,
          // -- we could decode the user from the token if the token is present
          auth.optional,
        ],
      },
    },
  });

  return (path: string) => AutoServer.getOrCreateRouter(type, path);
});

// -- http://localhost:3500/v1/ping
ExposedRouter('/v1')
  .get('/ping/', (_, res) => { res.send('Hello, world!'); });

// -- http://localhost:3600/v1/ping
StaffRouter('/v1')
  .get('/ping/', (_, res) => { res.send('Hello, staff!'); });

// -- http://localhost:3700/v1/ping
DeveloperRouter('/v1')
  .get('/ping/', (_, res) => { res.send('Hello, developer!'); });