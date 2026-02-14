export type ApiErrorCode = "UNAUTHORIZED" | "RATE_LIMIT" | "NETWORK" | "UNKNOWN";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  status?: number;
  details?: unknown;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor?: string | null;
  // TODO(BE): Confirm whether backend uses cursor or page-number pagination and adapt this model.
}
