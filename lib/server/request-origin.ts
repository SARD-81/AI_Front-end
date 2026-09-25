import {NextResponse} from 'next/server';

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

  return NextResponse.json(body, {status: 403});
}

export function crossSiteRejection(request: Request): NextResponse | null {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return rejectCrossSite('sec-fetch-site', {
      origin: request.headers.get('origin') ?? '',
      received: ''
    });
  }

  const origin = request.headers.get('origin');
  if (!origin) return null;

  let expected: string;
  try {
    expected = new URL(request.url).origin;
  } catch {
    return rejectCrossSite('invalid-request-url', {origin});
  }

  if (origin !== expected) {
    return rejectCrossSite('origin-mismatch', {origin, received: expected});
  }

  return null;
}
