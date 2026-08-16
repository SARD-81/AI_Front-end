import {beforeEach, describe, expect, it, vi} from 'vitest';

const backendFetchMock = vi.hoisted(() => vi.fn());
const callWithAutoRefreshMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/server/backend-fetch', () => ({
  backendFetch: backendFetchMock
}));

vi.mock('@/lib/server/with-refresh', () => ({
  callWithAutoRefresh: callWithAutoRefreshMock
}));

import {GET as getMe} from '@/app/api/app/auth/me/route';
import {GET as getProfile} from '@/app/api/app/auth/profile/route';

describe('profile and me BFF routes', () => {
  beforeEach(() => {
    backendFetchMock.mockReset();
    callWithAutoRefreshMock.mockReset();
    callWithAutoRefreshMock.mockImplementation(
      async (callback: (access: string) => Promise<unknown>) =>
        callback('test-access-token')
    );
  });

  it.each([
    ['profile', getProfile],
    ['me', getMe]
  ])('%s uses the canonical backend role without personnel-field inference', async (_name, getRoute) => {
    backendFetchMock.mockResolvedValue({
      identifier: '11229',
      personnel_id: '11229',
      full_name: 'Professor Example',
      role: 'professor',
      academic_rank: null,
      department: 'Computer Science',
      job_title: 'Legacy value that must not imply staff',
      is_profile_completed: true,
      must_change_password: false,
      is_locked: false
    });

    const response = await getRoute();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      user: {
        identifier: '11229',
        personnelId: '11229',
        role: 'professor',
        isProfileCompleted: true,
        mustChangePassword: false,
        isLocked: false
      },
      isProfileCompleted: true,
      mustChangePassword: false,
      isLocked: false
    });
    expect(body.user.role).not.toBe('staff');
    expect(backendFetchMock).toHaveBeenCalledWith(
      '/profile/',
      expect.objectContaining({
        base: 'auth',
        accessToken: 'test-access-token',
        method: 'GET'
      })
    );
  });
});
