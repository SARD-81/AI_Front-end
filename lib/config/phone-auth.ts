export function isPhoneAuthEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PHONE_AUTH_ENABLED === 'true';
}
