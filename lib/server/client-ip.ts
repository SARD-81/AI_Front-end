import 'server-only';
import {isIP} from 'node:net';
import {headers} from 'next/headers';

export function trustProxyClientIpEnabled() {
  return process.env.TRUST_PROXY_CLIENT_IP?.trim().toLowerCase() === 'true';
}

export function parseTrustedProxyClientIp(
  requestHeaders: Pick<Headers, 'get'>,
  trustProxy = trustProxyClientIpEnabled()
): string | undefined {
  if (!trustProxy) return undefined;

  // The reverse proxy must overwrite X-Real-IP with its observed remote
  // address. Do not consume browser-supplied X-Forwarded-For chains here.
  const raw = requestHeaders.get('x-real-ip')?.trim();
  if (!raw || raw.includes(',')) return undefined;

  return isIP(raw) ? raw : undefined;
}

export async function getTrustedClientIp(): Promise<string | undefined> {
  if (!trustProxyClientIpEnabled()) return undefined;

  try {
    const requestHeaders = await headers();
    return parseTrustedProxyClientIp(requestHeaders, true);
  } catch {
    // backendFetch can also be used outside a request context (tests/build-time
    // utilities). In that case there is no client IP to forward.
    return undefined;
  }
}
