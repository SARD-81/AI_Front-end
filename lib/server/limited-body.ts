import { ApiError } from '@/lib/server/backend-types';

export const MAX_JSON_BODY_BYTES = 65_536;
export const JSON_BODY_TIMEOUT_MS = 15_000;

export async function readJsonBody<T = unknown>(
  request: Request,
  maxBytes = MAX_JSON_BODY_BYTES,
  timeoutMs = JSON_BODY_TIMEOUT_MS
): Promise<T> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ApiError(
      'حجم درخواست بیش از حد مجاز است.',
      413,
      'request_body_too_large'
    );
  }

  if (!request.body) {
    throw new SyntaxError('Unexpected end of JSON input');
  }

  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = request.signal
    ? AbortSignal.any([request.signal, timeoutSignal])
    : timeoutSignal;
  const reader = request.body.getReader();
  const onAbort = () => {
    void reader.cancel().catch(() => undefined);
  };
  if (signal.aborted) onAbort();
  else signal.addEventListener('abort', onAbort, { once: true });

  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new ApiError(
          'حجم درخواست بیش از حد مجاز است.',
          413,
          'request_body_too_large'
        );
      }
      parts.push(value);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (request.signal?.aborted) {
      throw new ApiError('درخواست لغو شد.', 499, 'request_aborted');
    }
    if (timeoutSignal.aborted) {
      throw new ApiError(
        'خواندن بدنهٔ درخواست بیش از حد طول کشید.',
        408,
        'request_body_timeout'
      );
    }
    throw error;
  }

  if (request.signal?.aborted) {
    throw new ApiError('درخواست لغو شد.', 499, 'request_aborted');
  }
  if (timeoutSignal.aborted) {
    throw new ApiError(
      'خواندن بدنهٔ درخواست بیش از حد طول کشید.',
      408,
      'request_body_timeout'
    );
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
