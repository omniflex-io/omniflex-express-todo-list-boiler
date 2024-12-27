import path from 'path';
import dotenv from 'dotenv';
import { Algorithm } from 'jsonwebtoken';
import { TBaseConfig } from '@omniflex/core/types';
import { TSQLiteConfig } from '@omniflex/infra-sqlite/types';

dotenv.config();

const env = {
  isTesting: process.env.NODE_ENV === 'test',
  env: (process.env.NODE_ENV || 'development') as TBaseConfig['env'],
};

const jwt = {
  issuer: process.env.JWT_ISSUER || 'omniflex-server',
  expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '1d',
  algorithm: (process.env.JWT_ALGORITHM || 'RS256') as Algorithm,

  publicKeyPath: path.resolve(process.cwd(), process.env.JWT_PUBLIC_KEY_PATH || 'files/public.pem'),
  privateKeyPath: path.resolve(process.cwd(), process.env.JWT_PRIVATE_KEY_PATH || 'files/private.pem'),
};

const config: TBaseConfig & TSQLiteConfig & typeof env & {
  jwt: typeof jwt;
} = {
  ...env,

  jwt,

  logging: {
    exposeErrorDetails: process.env.EXPOSE_ERROR_DETAILS == 'true',
    level: (process.env.LOG_LEVEL || 'info') as TBaseConfig['logging']['level'],
  },

  server: {
    requestTimeoutInSeconds: parseInt(process.env.REQUEST_TIMEOUT_SECONDS || '30', 10),
  },

  sqlite: {
    storage: process.env.SQLITE_URI || '',
  },
};

export default config;
