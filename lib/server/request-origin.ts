import {NextResponse} from 'next/server';

export function crossSiteRejection(request: Request): NextResponse | null {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json(
      {message: 'درخواست از مبدأ نامعتبر است.', code: 'cross_site_request'},
      {status: 403}
    );
  }

  const origin = request.headers.get('origin');
  if (!origin) return null;

  let expected: string;
  try {
    expected = new URL(request.url).origin;
  } catch {
    return NextResponse.json(
      {message: 'درخواست از مبدأ نامعتبر است.', code: 'cross_site_request'},
      {status: 403}
    );
  }

  if (origin !== expected) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[cross_site_request] request origin ${origin} did not match received address ${expected}`
      );
    }
    return NextResponse.json(
      {message: 'درخواست از مبدأ نامعتبر است.', code: 'cross_site_request'},
      {status: 403}
    );
  }

  return null;
}
