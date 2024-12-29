import config from '@/config';
import { Sequelize } from 'sequelize';
import { Containers } from '@omniflex/core';
import * as ModuleIdentity from '@omniflex/module-identity-sequelize-v6';

// Initialize containers
Containers.asValues({
  config,
  sequelize: new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
  }),
});

ModuleIdentity.createRegisteredRepositories();

jest.mock('@/config', () => ({
  env: 'test',
  isTesting: true,

  logging: {
    level: 'error',
    exposeErrorDetails: false,
  },
  server: {
    requestTimeoutInSeconds: 5,
  },
  jwt: {
    issuer: 'ts-jest',
    algorithm: 'RS256',
    publicKeyPath: `${__dirname}/files/public.pem`,
    privateKeyPath: `${__dirname}/files/private.pem`,
  },
}));