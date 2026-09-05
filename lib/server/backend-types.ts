export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: unknown;
  // Seconds to wait before retrying. `null` means the backend/edge did not
  // provide a usable delay (for example an Nginx-generated 429).
  retryAfter: number | null;

  constructor(
    message: string,
    status: number,
    code?: string,
    payload?: unknown,
    retryAfter: number | null = null
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
    this.retryAfter = retryAfter;
  }
}
