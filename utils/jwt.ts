import config from '@/config';
import { errors } from '@omniflex/core';

import fs from 'fs/promises';
import jwt from 'jsonwebtoken';

const loadKey = (path: string) => fs.readFile(path, 'utf8');

export class JwtProvider {
  private _publicKey?: string;
  private _privateKey?: string;

  get401Error(errorCode?: string) {
    return errors.unauthorized({
      errorCode,
      error: 'JWT_PROVIDER',
    });
  }

  async sign(
    payload: Record<string, any>,
    expiresInMs: number,
  ): Promise<string> {
    await this._loadKeys();

    return jwt.sign(payload, this._privateKey!, {
      expiresIn: Math.floor(expiresInMs / 1000),
      algorithm: config.jwt.algorithm,
      issuer: config.jwt.issuer || undefined,
    });
  }

  async decode(token: string): Promise<Record<string, any>> {
    return jwt.decode(token) as Record<string, any>;
  }

  async verify(token: string): Promise<Record<string, any>> {
    await this._loadKeys();

    try {
      return jwt.verify(
        token,
        this._publicKey!,
        {
          issuer: config.jwt.issuer,
          algorithms: [config.jwt.algorithm],
        },
      ) as Record<string, any>;
    } catch {
      throw this.get401Error();
    }
  }

  private async _loadKeys() {
    if (!this._publicKey) {
      this._publicKey = await loadKey(config.jwt.publicKeyPath);
    }

    if (!this._privateKey) {
      this._privateKey = await loadKey(config.jwt.privateKeyPath);
    }
  }
}

export const jwtProvider = new JwtProvider();
