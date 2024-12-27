import fs from 'fs/promises';
import { modulesSchemas } from '@omniflex/core';
import { servers, DeveloperRouter } from '@/servers';

import helmet from 'helmet';
import swaggerUI from 'swagger-ui-express';
import swaggerAutogen from '@omniflex/infra-swagger-autogen';

const resolvePath = async (relativePath: string) => {
  const dirname = import.meta.dirname;
  const { join } = await import('path');

  return join(dirname, relativePath);
};

const generateSwagger = async () => {
  const pathTo = await resolvePath('../docs');
  await fs.mkdir(pathTo, { recursive: true });

  await Promise.all(
    servers.map(async ({ type, port }) => {
      const doc = {
        info: {
          title: type,
        },

        servers: [
          { url: `http://localhost:${port || 'unknown'}` },
        ],

        components: {
          '@schemas': modulesSchemas,

          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
            },
          },
        },
      };

      // -- docs/swagger-(exposed|staff|developer).json
      const outputFile = `${pathTo}/swagger-${type}.json`;

      // -- only read from modules/*/(exposed|staff|developer).routes.(ts|js)
      const routes = [
        `./modules/*/${type}.routes`,
        `./modules/*/*.${type}.routes`,
      ]
        .flatMap(file => [`${file}.ts`, `${file}.js`]);

      await swaggerAutogen({ openapi: '3.0.0' })(outputFile, routes, doc);
    }),
  );
};

const swaggerRoutes = async () => {
  const router = DeveloperRouter('/swagger');
  const { pathToFileURL } = await import('url');

  (router as any)._unsafeRoutes = true;

  for (const { type, port } of servers) {
    router
      .use(`/${type}`,
        async (req, _, next) => {
          const path = await resolvePath(`../docs/swagger-${type}.json`);

          const imported = (await import(`${pathToFileURL(path)}`, {
            assert: {
              type: 'json',
            },
          }));

          req.swaggerDoc = imported.default;
          next();
        },
        helmet({
          contentSecurityPolicy: {
            directives: {
              'connect-src': `localhost:${port}`,
            },
          },
        }),
        swaggerUI.serveFiles(undefined, {
          swaggerOptions: {
            defaultModelsExpandDepth: -1,
            defaultModelExpandDepth: 999,
          },
        }),
        swaggerUI.setup(),
      );
  }
};

export const initialize = async () => {
  await generateSwagger();
  await swaggerRoutes();
};