import { NextResponse } from 'next/server';
import { backendFetch } from '@/lib/server/backend-fetch';
import { routeErrorResponse } from '@/lib/server/route-error';
import { callWithAutoRefresh } from '@/lib/server/with-refresh';
import {
  normalizeAuthProfile,
  type BackendProfile
} from '@/lib/server/auth-profile-normalizer';

type ProfileBody = {
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  student_id?: string;
  studentId?: string;
};

function editableProfilePayload(body: ProfileBody) {
  const payload: Record<string, string> = {};
  const fields: Array<[keyof ProfileBody, keyof ProfileBody, string]> = [
    ['first_name', 'firstName', 'first_name'],
    ['last_name', 'lastName', 'last_name']
  ];

  for (const [snakeKey, camelKey, backendKey] of fields) {
    const value = body[snakeKey] ?? body[camelKey];
    if (typeof value === 'string') {
      payload[backendKey] = value;
    }
  }

  return payload;
}

async function requestProfile(method: 'PATCH' | 'PUT', request: Request) {
  const body = (await request.json()) as ProfileBody;
  const payload = editableProfilePayload(body);
  const profile = await callWithAutoRefresh((access) =>
    backendFetch<BackendProfile>('/profile/', {
      base: 'auth',
      accessToken: access,
      method,
      body: JSON.stringify(payload)
    })
  );

  return NextResponse.json(normalizeAuthProfile(profile));
}

export async function GET() {
  try {
    const profile = await callWithAutoRefresh((access) =>
      backendFetch<BackendProfile>('/profile/', {
        base: 'auth',
        accessToken: access,
        method: 'GET'
      })
    );

    return NextResponse.json(normalizeAuthProfile(profile));
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    return await requestProfile('PATCH', request);
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    return await requestProfile('PUT', request);
  } catch (error) {
    return routeErrorResponse(error);
  }
}
