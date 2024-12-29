import config from '@/config';
import { BcryptHashProvider } from '@/utils/hash';

import * as Sqlite from '@omniflex/infra-sqlite';
import { AutoServer } from '@omniflex/infra-express';

import * as swagger from './swagger';
import { createLogger } from '@omniflex/infra-winston';
import { autoImport, Containers, initializeAppContainer } from '@omniflex/core';

// -- register the winston logger before the app could log anything
initializeAppContainer({
  logger: createLogger({ config }),
  hashProvider: new BcryptHashProvider(),
});

// -- initialize the identity module schemas
const initializeIdentity = async () => {
  const sequelize = await import('@omniflex/module-identity-sequelize-v6');
  sequelize.createRegisteredRepositories();
};

(async () => {
  // -- connect to sqlite database
  const sequelize = await Sqlite.getConnection(config);

  // -- register the config and sqlite connection
  Containers.asValues({
    config,
    sequelize,
  });

  await initializeIdentity();

  // -- auto import the modules under the modules folder
  // -- only files ending with '.repo' or '.routes' will be imported
  await (async () => {
    const dirname = import.meta.dirname;
    const { join } = await import('path');
    const path = join(dirname, '../modules');

    await autoImport(path, filename =>
      filename.endsWith('.repo') || // -- repositories
      filename.endsWith('.routes'),  // -- routes
    );
  })();

  if (sequelize) {
    await sequelize.sync();
  }

  if (!config.isTesting) {
    await swagger.initialize();  // -- generate docs and bind routes
  }

  await AutoServer.start();
})();