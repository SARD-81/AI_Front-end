import { describe, expect, it, vi } from 'vitest';
import { readHistoryWindow } from './chat-history';

const message = (i: number) => ({
  id: String(i),
  created_at: new Date(1700000000000 + i * 1000).toISOString()
});
const rows = Array.from({ length: 25 }, (_, i) => message(i));

it('returns ten latest messages, then ten older, then the remainder despite new arrivals', async () => {
  const records = [...rows];
  const load = vi.fn(async (query: string) =>
    query
      ? { results: records.slice(12), next: null }
      : { results: records.slice(0, 12), next: '/messages/?cursor=second' }
  );
  const latest = await readHistoryWindow(load, null);
  expect(latest.results.map((m) => m.id)).toEqual(
    rows.slice(15).map((m) => m.id)
  );
  records.push(message(25));
  const older = await readHistoryWindow(load, latest.olderCursor);
  expect(older.results.map((m) => m.id)).toEqual(
    rows.slice(5, 15).map((m) => m.id)
  );
  const first = await readHistoryWindow(load, older.olderCursor);
  expect(first.results).toEqual(rows.slice(0, 5));
  expect(first.olderCursor).toBeNull();
});

it('issues one backend request per legacy page and stops an unbounded scan', async () => {
  const load = vi.fn(async (query: string) => {
    const page = Number(new URLSearchParams(query).get('cursor') ?? '0');
    return {
      results: [message(page)],
      next: page < 2 ? `?cursor=${page + 1}` : null
    };
  });
  await readHistoryWindow(load, null);
  expect(load).toHaveBeenCalledTimes(3);

  const longLoad = vi.fn(async (query: string) => {
    const page = Number(new URLSearchParams(query).get('cursor') ?? '0');
    return { results: [message(page)], next: `?cursor=${page + 1}` };
  });
  await expect(readHistoryWindow(longLoad, null)).rejects.toMatchObject({
    status: 503,
    code: 'HISTORY_SCAN_LIMIT'
  });
  expect(longLoad.mock.calls.length).toBeLessThanOrEqual(26);
});

it('stops a slow compat scan on the cumulative budget without returning a partial window', async () => {
  let now = 1_000_000;
  const spy = vi.spyOn(Date, 'now').mockImplementation(() => now);
  const load = vi.fn(async (query: string) => {
    now += 21_000;
    const page = Number(new URLSearchParams(query).get('cursor') ?? '0');
    return { results: [message(page)], next: `?cursor=${page + 1}` };
  });
  await expect(readHistoryWindow(load, null)).rejects.toMatchObject({
    status: 503,
    code: 'HISTORY_SCAN_LIMIT'
  });
  expect(load).toHaveBeenCalledTimes(1);
  spy.mockRestore();
});

it('uses exactly one backend call in native mode and restores chronological display order', async () => {
  const load = vi.fn(async () => ({
    results: rows.slice(15).reverse(),
    next: '/messages/?cursor=older%2B%2F%3D'
  }));
  const page = await readHistoryWindow(load, null, true);
  expect(load).toHaveBeenCalledTimes(1);
  expect(load).toHaveBeenCalledWith('page_size=10&ordering=-created_at');
  expect(page.results).toEqual(rows.slice(15));
  load.mockResolvedValue({ results: rows.slice(5, 15).reverse(), next: '' });
  await readHistoryWindow(load, page.olderCursor, true);
  expect(load).toHaveBeenLastCalledWith(
    'page_size=10&ordering=-created_at&cursor=older%2B%2F%3D'
  );
});

describe('safe history responses', () => {
  it('does not accept a backend that ignores native ordering or size', async () => {
    await expect(
      readHistoryWindow(async () => ({ results: rows }), null, true)
    ).rejects.toThrow('latest-first');
    await expect(
      readHistoryWindow(
        async () => ({ results: rows.slice(0, 10) }),
        null,
        true
      )
    ).rejects.toThrow('latest-first');
  });
  it('rejects cursor loops and failed later pages instead of returning partial results', async () => {
    await expect(
      readHistoryWindow(
        async () => ({ results: rows, next: '?cursor=loop' }),
        null
      )
    ).rejects.toThrow('Repeated');
    await expect(
      readHistoryWindow(async (query) => {
        if (query) throw new Error('backend unavailable');
        return { results: rows.slice(0, 10), next: '?cursor=second' };
      }, null)
    ).rejects.toThrow('backend unavailable');
  });
  it('rejects invalid cursors before making a request', async () => {
    const load = vi.fn();
    await expect(readHistoryWindow(load, 'invalid')).rejects.toMatchObject({
      status: 400
    });
    expect(load).not.toHaveBeenCalled();
  });
  it('handles an empty conversation and deduplicates overlapping pages', async () => {
    expect(
      await readHistoryWindow(async () => ({ results: [] }), null)
    ).toEqual({ results: [], olderCursor: null });
    const load = vi.fn(async (query) =>
      query
        ? { results: rows.slice(10) }
        : { results: rows.slice(0, 15), next: '?cursor=x' }
    );
    expect((await readHistoryWindow(load, null)).results).toEqual(
      rows.slice(15)
    );
  });
});
