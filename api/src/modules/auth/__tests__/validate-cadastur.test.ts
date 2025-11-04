import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { app } from '../../../app';
import { cadasturLookupService } from '../../../services/cadastur-lookup';

type CsrfBundle = { token: string; cookies: string[] };
type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};
type HttpResult = {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
};

describe('POST /api/auth/validate-cadastur', () => {
  let server: http.Server;
  let port: number;

  const makeRequest = (path: string, options: RequestOptions = {}): Promise<HttpResult> => {
    const method = options.method ?? 'GET';
    const headers = options.headers ?? {};
    const body = options.body ?? '';

    return new Promise<HttpResult>((resolve, reject) => {
      const request = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: {
            ...headers,
            ...(body && !headers['content-length']
              ? { 'content-length': Buffer.byteLength(body).toString() }
              : {}),
          },
        },
        (response) => {
          const chunks: Buffer[] = [];

          response.on('data', (chunk) => {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
          });

          response.on('end', () => {
            resolve({
              status: response.statusCode ?? 0,
              headers: response.headers,
              body: Buffer.concat(chunks).toString('utf8'),
            });
          });
        },
      );

      request.on('error', reject);

      if (body) {
        request.write(body);
      }

      request.end();
    });
  };

  const fetchCsrfBundle = async (): Promise<CsrfBundle> => {
    const response = await makeRequest('/api/healthz');
    const rawCookies = response.headers['set-cookie'];
    const cookies = Array.isArray(rawCookies)
      ? rawCookies
      : rawCookies
      ? [rawCookies]
      : [];
    const csrfCookie = cookies.find((cookie) => cookie.startsWith('csrfToken='));
    const token = csrfCookie ? csrfCookie.split(';')[0].split('=')[1] : '';

    return { token, cookies };
  };

  const postValidation = async (payload: Record<string, string>) => {
    const csrf = await fetchCsrfBundle();
    const body = JSON.stringify(payload);
    const response = await makeRequest('/api/auth/validate-cadastur', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': csrf.token,
        cookie: csrf.cookies.join('; '),
      },
      body,
    });

    const data = JSON.parse(response.body);
    return { response, data };
  };

  beforeAll(async () => {
    await cadasturLookupService.refresh();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => resolve());
    });
    const address = server.address() as AddressInfo;
    port = address.port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  });

  it('confirms exact matches', async () => {
    const { response, data } = await postValidation({
      name: 'Julieli Ferrari dos Santos',
      cadastur_number: '21467985879',
    });

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      valid: true,
      exact_match: true,
      official_name: 'JULIELI FERRARI DOS SANTOS',
    });
  });

  it('returns partial matches when particles differ', async () => {
    const { response, data } = await postValidation({
      name: 'Julieli Ferrari Santos',
      cadastur_number: '21467985879',
    });

    expect(response.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(data.exact_match).toBe(false);
    expect(data.official_name).toBe('JULIELI FERRARI DOS SANTOS');
  });

  it('rejects mismatched names for existing numbers', async () => {
    const { response, data } = await postValidation({
      name: 'Outra Pessoa',
      cadastur_number: '21467985879',
    });

    expect(response.status).toBe(409);
    expect(data.valid).toBe(false);
    expect(data.code).toBe('CADASTUR_NAME_MISMATCH');
  });

  it('returns not found when number does not exist', async () => {
    const { response, data } = await postValidation({
      name: 'Qualquer Nome',
      cadastur_number: '00000000000',
    });

    expect(response.status).toBe(404);
    expect(data.code).toBe('CADASTUR_NUMBER_NOT_FOUND');
  });

  it('validates number length', async () => {
    const { response, data } = await postValidation({
      name: 'Qualquer Nome',
      cadastur_number: '1234567890',
    });

    expect(response.status).toBe(400);
    expect(data.valid).toBe(false);
  });
});
