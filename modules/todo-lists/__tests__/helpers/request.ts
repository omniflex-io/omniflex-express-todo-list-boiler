import request from 'supertest';
import { Express } from 'express';

const expectCode = async (app: Express, {
  url,
  code,
  data,
  method,
  bearerToken,
}: {
  data?: any;
  url: string;
  code: number;
  bearerToken?: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
}) => {
  const chainedRequest = request(app)[method](url);
  const withBearer = bearerToken ?
    chainedRequest.set('Authorization', `Bearer ${bearerToken}`) :
    chainedRequest;

  const withData = data ? withBearer.send(data) : withBearer;

  return await withData.expect(code);
};

export class RequestHelper {
  constructor(
    private appFactory: () => Express,
    protected expectCode: number = 200,
  ) { }

  public async post(
    url: string,
    data: any,
    bearerToken?: string,
  ) {
    return await expectCode(this._app, {
      url,
      data,
      bearerToken,

      method: 'post',
      code: this.expectCode,
    });
  }

  public async patch(
    url: string,
    data: any,
    bearerToken?: string,
  ) {
    return await expectCode(this._app, {
      url,
      data,
      bearerToken,
      method: 'patch',
      code: this.expectCode,
    });
  }

  public async get(
    url: string,
    bearerToken?: string,
  ) {
    return await expectCode(this._app, {
      url,
      bearerToken,

      method: 'get',
      code: this.expectCode,
    });
  }

  private get _app() {
    return this.appFactory();
  }
}