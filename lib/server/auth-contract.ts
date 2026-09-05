import 'server-only';
import {ApiError} from '@/lib/server/backend-types';
import type {LoginResponseDTO} from '@/lib/types/auth';

export type BackendAuthContract = {
  access?: string | null;
  refresh?: string | null;
  identifier?: string | null;
  student_id?: string | null;
  studentId?: string | null;
  personnel_id?: string | null;
  personnelId?: string | null;
  full_name?: string | null;
  fullName?: string | null;
  role?: string | null;
  is_profile_completed?: boolean | null;
  isProfileCompleted?: boolean | null;
  must_change_password?: boolean | null;
  mustChangePassword?: boolean | null;
  is_locked?: boolean | null;
  isLocked?: boolean | null;
  user?: {
    identifier?: string | null;
    student_id?: string | null;
    studentId?: string | null;
    personnel_id?: string | null;
    personnelId?: string | null;
    full_name?: string | null;
    fullName?: string | null;
    role?: string | null;
    is_profile_completed?: boolean | null;
    isProfileCompleted?: boolean | null;
    must_change_password?: boolean | null;
    mustChangePassword?: boolean | null;
    is_locked?: boolean | null;
    isLocked?: boolean | null;
  };
};

function text(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function flag(value: unknown) {
  return typeof value === 'boolean' ? value : undefined;
}

export function normalizeBackendAuthContract(data: BackendAuthContract): {
  access: string;
  refresh?: string;
  result: LoginResponseDTO;
} {
  const access = text(data.access);
  if (!access) {
    throw new ApiError(
      'پاسخ احراز هویت سرور ناقص است.',
      502,
      'AUTH_CONTRACT_INVALID'
    );
  }

  const user = data.user ?? {};
  const isProfileCompleted =
    flag(data.is_profile_completed) ??
    flag(data.isProfileCompleted) ??
    flag(user.is_profile_completed) ??
    flag(user.isProfileCompleted);
  const mustChangePassword =
    flag(data.must_change_password) ??
    flag(data.mustChangePassword) ??
    flag(user.must_change_password) ??
    flag(user.mustChangePassword);
  const isLocked =
    flag(data.is_locked) ??
    flag(data.isLocked) ??
    flag(user.is_locked) ??
    flag(user.isLocked);

  const result: LoginResponseDTO = {
    user: {
      identifier: text(data.identifier) ?? text(user.identifier),
      studentId:
        text(data.student_id) ??
        text(data.studentId) ??
        text(user.student_id) ??
        text(user.studentId),
      personnelId:
        text(data.personnel_id) ??
        text(data.personnelId) ??
        text(user.personnel_id) ??
        text(user.personnelId),
      fullName:
        text(data.full_name) ??
        text(data.fullName) ??
        text(user.full_name) ??
        text(user.fullName),
      role: text(data.role) ?? text(user.role),
      isProfileCompleted,
      mustChangePassword,
      isLocked
    },
    isProfileCompleted,
    mustChangePassword,
    isLocked
  };

  return {
    access,
    refresh: text(data.refresh),
    result
  };
}
