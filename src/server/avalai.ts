import 'server-only';

type AvalaiErrorPayload = {
  error?: {
    message?: string;
    code?: string;
    type?: string;
  };
  message?: string;
};

export class AvalaiHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: AvalaiErrorPayload
  ) {
    super(message);
  }
}

const AVALAI_BASE_URL = process.env.AVALAI_BASE_URL ?? 'https://api.avalai.ir/v1';
const AVALAI_USER_BASE_URL = process.env.AVALAI_USER_BASE_URL ?? 'https://api.avalai.ir/user/v1';

function getApiKey() {
  const key = process.env.AVALAI_API_KEY;
  if (!key) {
    throw new AvalaiHttpError('AVALAI_API_KEY is not configured.', 500);
  }
  return key;
}

function buildHeaders(initHeaders?: HeadersInit): Headers {
  const headers = new Headers(initHeaders);
  headers.set('Authorization', `Bearer ${getApiKey()}`);
  return headers;
}

async function parseError(response: Response): Promise<AvalaiHttpError> {
  const payload = (await response.json().catch(() => undefined)) as AvalaiErrorPayload | undefined;
  const message = payload?.error?.message ?? payload?.message ?? `AvalAI request failed with status ${response.status}.`;
  return new AvalaiHttpError(message, response.status, payload);
}

export async function avalaiJson<T>(
  path: string,
  init: RequestInit & {useUserBase?: boolean}
): Promise<{data: T; requestId: string | null}> {
  const useUserBase = init.useUserBase ?? false;
  const baseUrl = useUserBase ? AVALAI_USER_BASE_URL : AVALAI_BASE_URL;
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: buildHeaders(init.headers)
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  const data = (await response.json()) as T;
  return {data, requestId: response.headers.get('x-request-id')};
}

export async function avalaiStream(
  path: string,
  init: RequestInit
): Promise<{response: Response; requestId: string | null}> {
  const response = await fetch(`${AVALAI_BASE_URL}${path}`, {
    ...init,
    headers: buildHeaders(init.headers)
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  if (!response.body) {
    throw new AvalaiHttpError('AvalAI stream response body is empty.', 502);
  }

  return {response, requestId: response.headers.get('x-request-id')};
}
