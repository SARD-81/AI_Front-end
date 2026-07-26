import {apiFetch} from '@/lib/api/client';
import type {FeedbackReasonCategory} from '@/lib/api/chat';
import {API_ENDPOINTS} from '@/lib/config/api-endpoints';

export type FeedbackReportRange = {
  from_date: string;
  to_date: string;
};

export type FeedbackReportMetrics = {
  total_feedback: number;
  total_likes: number;
  total_dislikes: number;
  total_neutral: number;
};

export type DislikeReasonShare = {
  reason_category: FeedbackReasonCategory;
  count: number;
  // Share of all dislikes in the range, rounded to one decimal.
  percentage: number;
};

export type FeedbackReport = {
  date_range: FeedbackReportRange;
  metrics: FeedbackReportMetrics;
  dislike_reasons_distribution: DislikeReasonShare[];
};

export type SuspiciousUser = {
  user_id: number;
  // Student number for students; falls back to the email address for other roles.
  student_id: string;
  full_name: string;
  email: string;
  messages_today: number;
  is_locked: boolean;
};

export type SuspiciousUsersResponse = {
  suspicious_users: SuspiciousUser[];
};

export type ToggleLockResponse = {
  message: string;
  user_id: number;
  // New lock state after the toggle.
  is_locked: boolean;
};

export type LivenessResponse = {
  status: 'healthy';
};

export type ReadinessResponse = {
  status: 'ready' | 'not_ready';
  checks: {
    database: string;
    cache: string;
  };
};

// Aggregate feedback metrics. Both dates are optional (YYYY-MM-DD); the backend
// defaults to the last 7 days. Admin-only, throttled at 60/min.
export async function fetchFeedbackReport(range?: Partial<FeedbackReportRange>) {
  const query = new URLSearchParams();
  if (range?.from_date) query.set('from_date', range.from_date);
  if (range?.to_date) query.set('to_date', range.to_date);
  const suffix = query.size ? `?${query.toString()}` : '';

  return apiFetch<FeedbackReport>(`${API_ENDPOINTS.admin.reports.feedback}${suffix}`);
}

// Users who sent 30 or more messages today. An empty list is a normal result.
export async function fetchSuspiciousUsers() {
  return apiFetch<SuspiciousUsersResponse>(API_ENDPOINTS.admin.reports.suspiciousUsers);
}

// Role-agnostic lock toggle by primary key; works for every role.
export async function toggleUserLockById(userId: number | string) {
  return apiFetch<ToggleLockResponse>(API_ENDPOINTS.admin.users.toggleLockById(String(userId)), {
    method: 'POST'
  });
}

// Legacy lock toggle that resolves STUDENT accounts by student number.
export async function toggleUserLockByStudentId(studentId: string) {
  return apiFetch<ToggleLockResponse>(
    API_ENDPOINTS.admin.users.toggleLockByStudentId(studentId),
    {method: 'POST'}
  );
}

// Liveness probe: 200 whenever the backend process can answer at all.
export async function fetchLiveness() {
  return apiFetch<LivenessResponse>(API_ENDPOINTS.health.live);
}

// Readiness probe: resolves on 200 (`ready`). A dependency failure is a 503
// carrying the same body shape, which `apiFetch` raises as an ApiError whose
// payload is a ReadinessResponse.
export async function fetchReadiness() {
  return apiFetch<ReadinessResponse>(API_ENDPOINTS.health.ready);
}
