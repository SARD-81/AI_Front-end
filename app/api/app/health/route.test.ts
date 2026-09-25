import {expect, it, vi} from 'vitest';
import {GET} from '@/app/api/app/health/route';

it('answers liveness without calling the backend', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({status: 'live'});
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(fetchMock).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
