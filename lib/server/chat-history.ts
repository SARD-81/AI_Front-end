import { ApiError } from './backend-types';

export const HISTORY_PAGE_SIZE = 10;
type Message = {
  id: string;
  created_at?: string;
  createdAt?: string;
  [key: string]: unknown;
};
type BackendPage = { results: Message[]; next?: string | null };
type Cursor = { mode: 'compat' | 'native'; value: string };
type Load = (query: string) => Promise<BackendPage>;

function fail(message: string, status = 502, code = 'HISTORY_PAGE_INVALID'): never {
  throw new ApiError(message, status, code);
}
function encode(cursor: Cursor) {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}
function decode(raw: string | null, mode: Cursor['mode']): Cursor | null {
  if (!raw) return null;
  try {
    if (raw.length > 8192) throw new Error();
    const cursor = JSON.parse(Buffer.from(raw, 'base64url').toString());
    if (
      cursor.mode !== mode ||
      typeof cursor.value !== 'string' ||
      !cursor.value
    )
      throw new Error();
    return cursor;
  } catch {
    return fail('Invalid history cursor. Reload the conversation.', 400);
  }
}
function timestamp(message: Message) {
  const time = Date.parse(message.created_at ?? message.createdAt ?? '');
  if (!Number.isFinite(time)) fail('History message has no valid timestamp.');
  return time;
}
function validate(page: BackendPage) {
  if (
    !Array.isArray(page.results) ||
    page.results.some((m) => !m || typeof m.id !== 'string')
  ) {
    fail('Invalid history response.');
  }
  page.results.forEach(timestamp);
  return page;
}
function nextCursor(next?: string | null) {
  if (!next) return null;
  // Extract only the cursor; never fetch an upstream-provided URL.
  const cursor = new URL(next, 'http://history.invalid').searchParams.get(
    'cursor'
  );
  if (!cursor) fail('History pagination link is missing its cursor.');
  return cursor;
}

/** Compatibility is safe for the existing API. Native mode requires the documented backend contract. */
export async function readHistoryWindow(
  load: Load,
  raw: string | null,
  native = false
) {
  const mode = native ? 'native' : 'compat';
  const cursor = decode(raw, mode);
  if (native) {
    const query = new URLSearchParams({
      page_size: String(HISTORY_PAGE_SIZE),
      ordering: '-created_at'
    });
    if (cursor) query.set('cursor', cursor.value);
    const page = validate(await load(query.toString()));
    if (
      page.results.length > HISTORY_PAGE_SIZE ||
      page.results.some(
        (m, i, rows) => i > 0 && timestamp(m) > timestamp(rows[i - 1])
      )
    ) {
      fail('Backend does not satisfy latest-first history pagination.');
    }
    const next = nextCursor(page.next);
    if (next && next === cursor?.value) fail('Repeated history cursor.');
    return {
      results: [...page.results].reverse(),
      olderCursor: next ? encode({ mode, value: next }) : null
    };
  }

  // The legacy contract cannot seek to the tail. Keep this scan server-side and
  // return only the requested window, rather than transfer every page to the UI.
  // This is a temporary resource ceiling, not latest-first pagination. A longer
  // history fails explicitly instead of scanning without a bound.
  const COMPAT_MAX_PAGES = 25;
  const messages = new Map<string, Message>();
  const visited = new Set<string>();
  let next: string | null = null;
  let pages = 0;
  do {
    pages += 1;
    if (pages > COMPAT_MAX_PAGES) {
      fail(
        'تاریخچهٔ این گفتگو برای بارگذاری کامل بیش از حد بلند است. تا آماده‌شدن صفحه‌بندی سمت سرور، دوباره تلاش کنید.',
        503,
        'HISTORY_SCAN_LIMIT'
      );
    }
    const page = validate(
      await load(next ? new URLSearchParams({ cursor: next }).toString() : '')
    );
    page.results.forEach((m) => messages.set(m.id, m));
    next = nextCursor(page.next);
    if (next) {
      if (visited.has(next)) fail('Repeated history cursor.');
      visited.add(next);
    }
  } while (next);
  const ordered = [...messages.values()].sort(
    (a, b) => timestamp(a) - timestamp(b)
  );
  const end = cursor
    ? ordered.findIndex((m) => m.id === cursor.value)
    : ordered.length;
  if (end < 0)
    fail('History cursor no longer exists. Reload the conversation.', 409);
  const start = Math.max(0, end - HISTORY_PAGE_SIZE);
  const results = ordered.slice(start, end);
  return {
    results,
    olderCursor: start > 0 ? encode({ mode, value: results[0].id }) : null
  };
}
