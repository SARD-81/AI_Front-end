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
  // The pilot contract has no token fields, even empty ones. Reject a mixed
  // response so a future backend change cannot silently become a session.
  if ('access' in record || 'refresh' in record) return null;
  if (record.status !== 'password_updated') return null;
  if (
    (record.phone_login_required !== undefined &&
      typeof record.phone_login_required !== 'boolean') ||
    (record.phone_setup_required !== undefined &&
      typeof record.phone_setup_required !== 'boolean')
  ) {
    return null;
  }
  const phoneLogin = record.phone_login_required === true;
  const phoneSetup = record.phone_setup_required === true;
  if (phoneLogin === phoneSetup) return null;
  return {
    status: 'password_updated',
    phone_login_required: phoneLogin,
    phone_setup_required: phoneSetup
  };
}
