export type MigratedPasswordResult = {
  status: 'password_updated';
  phone_login_required: boolean;
  phone_setup_required: boolean;
};

export function parseMigratedPasswordResponse(
  data: unknown
): MigratedPasswordResult | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const access = typeof record.access === 'string' ? record.access : '';
  const refresh = typeof record.refresh === 'string' ? record.refresh : '';
  if (access || refresh) return null;
  if (record.status !== 'password_updated') return null;
  const phoneLogin = record.phone_login_required === true;
  const phoneSetup = record.phone_setup_required === true;
  if (phoneLogin === phoneSetup) return null;
  return {
    status: 'password_updated',
    phone_login_required: phoneLogin,
    phone_setup_required: phoneSetup
  };
}
