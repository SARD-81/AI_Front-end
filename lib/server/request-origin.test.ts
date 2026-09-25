import { afterEach, describe, expect, it, vi } from 'vitest';
import { crossSiteRejection } from '@/lib/server/request-origin';

function mutation(
  headers: Record<string, string> = {},
  url = 'http://localhost/api/app/auth/login'
) {
  return new Request(url, { method: 'POST', headers });
}

describe('cookie mutation origin policy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts a same-origin request and would not be a rejection', () => {
    expect(
      crossSiteRejection(mutation({ origin: 'http://localhost' }))
    ).toBeNull();
  });

  it('accepts a missing Origin only when the browser attests same-origin', () => {
    expect(
      crossSiteRejection(mutation({ 'sec-fetch-site': 'same-origin' }))
    ).toBeNull();
  });

  it('rejects a missing Origin when Fetch Metadata is absent', async () => {
    const response = crossSiteRejection(mutation());
    expect(response?.status).toBe(403);
    expect(await response?.json()).toMatchObject({
      code: 'cross_site_request'
    });
  });

  it('rejects a different origin before any caller reaches the backend', async () => {
    const response = crossSiteRejection(
      mutation({
        origin: 'https://evil.example',
        'sec-fetch-site': 'cross-site'
      })
    );
    expect(response?.status).toBe(403);
    expect(await response?.json()).toMatchObject({
      code: 'cross_site_request'
    });
  });

  it('rejects a same-site subdomain instead of treating it as same-origin', async () => {
    vi.stubEnv('PUBLIC_APP_ORIGIN', 'https://soha.sbu.ac.ir');
    const response = crossSiteRejection(
      mutation(
        {
          origin: 'https://mail.sbu.ac.ir',
          'sec-fetch-site': 'same-site'
        },
        'http://127.0.0.1:3000/api/app/conversations'
      )
    );
    expect(response?.status).toBe(403);
  });

  it('rejects an invalid Sec-Fetch-Site value', async () => {
    const response = crossSiteRejection(
      mutation({ origin: 'http://localhost', 'sec-fetch-site': 'cross-site' })
    );
    expect(response?.status).toBe(403);
  });

  it('uses only PUBLIC_APP_ORIGIN behind a proxy and ignores the internal host', () => {
    vi.stubEnv('PUBLIC_APP_ORIGIN', 'https://soha.sbu.ac.ir');
    const internal = mutation(
      {
        origin: 'https://soha.sbu.ac.ir',
        'x-forwarded-host': 'evil.example',
        host: 'evil.example'
      },
      'http://127.0.0.1:3000/api/app/auth/logout'
    );
    expect(crossSiteRejection(internal)).toBeNull();

    const spoofed = mutation(
      { origin: 'http://127.0.0.1:3000', host: 'soha.sbu.ac.ir' },
      'http://127.0.0.1:3000/api/app/auth/logout'
    );
    expect(crossSiteRejection(spoofed)?.status).toBe(403);
  });

  it('rejects production mutations when PUBLIC_APP_ORIGIN is missing or not https', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const missing = crossSiteRejection(
      mutation(
        { origin: 'http://127.0.0.1:3000' },
        'http://127.0.0.1:3000/api/app/auth/logout'
      )
    );
    expect(missing?.status).toBe(403);

    vi.stubEnv('PUBLIC_APP_ORIGIN', 'http://soha.internal');
    const insecure = crossSiteRejection(
      mutation(
        { origin: 'http://soha.internal' },
        'http://127.0.0.1:3000/api/app/auth/logout'
      )
    );
    expect(insecure?.status).toBe(403);

    vi.stubEnv('PUBLIC_APP_ORIGIN', 'https://soha.sbu.ac.ir');
    expect(
      crossSiteRejection(
        mutation(
          { origin: 'https://soha.sbu.ac.ir' },
          'http://127.0.0.1:3000/api/app/auth/logout'
        )
      )
    ).toBeNull();
  });

  it('still accepts local HTTP when production mode is off', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('PUBLIC_APP_ORIGIN', '');
    expect(
      crossSiteRejection(mutation({ origin: 'http://localhost' }))
    ).toBeNull();
  });

  it('does not apply the mutation check to safe methods', () => {
    const request = new Request('http://localhost/api/app/conversations', {
      method: 'GET'
    });
    expect(crossSiteRejection(request)).toBeNull();
  });
});
