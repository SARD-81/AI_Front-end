import {ApiError} from '@/lib/server/backend-types';

export const MAX_JSON_BODY_BYTES = 65_536;

export async function readJsonBody<T = unknown>(
  request: Request,
  maxBytes = MAX_JSON_BODY_BYTES
): Promise<T> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ApiError('حجم درخواست بیش از حد مجاز است.', 413, 'request_body_too_large');
  }

  if (!request.body) {
    throw new SyntaxError('Unexpected end of JSON input');
  }

  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ApiError('حجم درخواست بیش از حد مجاز است.', 413, 'request_body_too_large');
    }
    parts.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.byteLength;
  }
  const text = new TextDecoder().decode(merged);
  return JSON.parse(text) as T;
}
