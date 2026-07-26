export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: unknown;
  // Seconds to wait before retrying; mirrors the backend `retry_after` field
  // and the `Retry-After` header on 429 responses.
  retryAfter?: number;

  constructor(
    message: string,
    status: number,
    code?: string,
    payload?: unknown,
    retryAfter?: number
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
    this.retryAfter = retryAfter;
  }
}
