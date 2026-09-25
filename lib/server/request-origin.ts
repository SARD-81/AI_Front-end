import { NextResponse } from 'next/server';

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function rejectCrossSite(reason: string, detail: Record<string, string> = {}) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[cross_site_request] ${reason}`, detail);
  }

  const body: Record<string, string> = {
    message: 'درخواست از مبدأ نامعتبر است.',
    code: 'cross_site_request'
  };
  if (process.env.NODE_ENV === 'development') {
    body.reason = reason;
    Object.assign(body, detail);
  }

  return NextResponse.json(body, { status: 403 });
}

function parseConfiguredOrigin(configured: string): string | null {
  try {
    const url = new URL(configured);
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.pathname !== '/' && url.pathname !== '') return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Public origin the browser is allowed to call.
 * Host and X-Forwarded-Host are never consulted.
 * Production accepts only an https PUBLIC_APP_ORIGIN. A missing or invalid
 * value rejects state-changing requests; request.url is not a substitute,
 * because behind a proxy it is the internal address. Non-production keeps
 * the request URL so local HTTP development still works. Setting the
 * variable does not prove TLS termination has been tested.
 */
export function trustedPublicOrigin(request: Request): string | null {
  const configured = process.env.PUBLIC_APP_ORIGIN?.trim();
  if (configured) {
    const origin = parseConfiguredOrigin(configured);
    if (!origin) return null;
    if (
      process.env.NODE_ENV === 'production' &&
      new URL(origin).protocol !== 'https:'
    ) {
      return null;
    }
    return origin;
  }

  if (process.env.NODE_ENV === 'production') return null;

  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
}

export function crossSiteRejection(request: Request): NextResponse | null {
  if (!STATE_CHANGING.has(request.method.toUpperCase())) return null;

  const site = request.headers.get('sec-fetch-site');
  // same-site is a different origin (for example a subdomain). It is not
  // treated as same-origin.
  if (site === 'cross-site' || site === 'same-site') {
    return rejectCrossSite('sec-fetch-site', {
      origin: request.headers.get('origin') ?? '',
      received: site
    });
  }
  if (site && site !== 'same-origin' && site !== 'none') {
    return rejectCrossSite('sec-fetch-site', {
      origin: request.headers.get('origin') ?? '',
      received: site
    });
  }

  const expected = trustedPublicOrigin(request);
  if (!expected) {
    return rejectCrossSite('untrusted-public-origin', {
      origin: request.headers.get('origin') ?? ''
    });
  }

  const origin = request.headers.get('origin');
  if (origin) {
    if (origin !== expected) {
      return rejectCrossSite('origin-mismatch', { origin, received: expected });
    }
    return null;
  }

  // Browsers omit Origin on some same-origin requests but still send
  // Sec-Fetch-Site: same-origin. Any other missing-Origin case, including
  // no Fetch Metadata at all, is rejected so a cookie mutation cannot be
  // accepted from an unattested client.
  if (site === 'same-origin') return null;

  return rejectCrossSite('origin-missing', { origin: '', received: expected });
}
