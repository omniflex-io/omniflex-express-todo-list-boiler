import config from '@/config';
import { Sequelize } from 'sequelize';
import { Containers } from '@omniflex/core';

Containers.asValues({
  config,
  sequelize: new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
  }),
});

jest.mock('@/config', () => ({
  env: 'test',
  isTesting: true,
  ports: {
    exposed: (() => Math.floor(Math.random() * 1000) + 3000)(),
  },

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