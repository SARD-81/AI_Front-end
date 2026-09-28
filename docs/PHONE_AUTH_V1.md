# Phone-first auth with SMS OTP (frontend)

Staging SMS OTP is active again. The staging backend base URL supplied by the backend team is `http://172.16.16.106`; `GET /api/ready/` is expected to return `200`.

## Current staging contract

Set the Next/BFF environment to:

```env
BACKEND_ORIGIN=http://172.16.16.106
PHONE_AUTH_ENABLED=true
```

The browser continues to call same-origin `/api/app/*`. The Next.js BFF calls the backend under `/api/auth/phone/*`, so browser CORS is not needed for the normal BFF deployment. If the browser is changed to call the backend directly, the backend team must whitelist the exact frontend origin.

Registration and password recovery require SMS verification:

- New registration: `identify -> registration/request-otp -> registration/verify-otp -> register`. Final registration uses the returned `registration_token`; direct registration with `phone_number` is rejected by the frontend BFF.
- Password recovery: `password-reset/request-otp -> password-reset/verify-otp -> password-reset/complete`.
- Existing unverified account: phone/password login may return HTTP `202` with `status=phone_verification_required` and `activation_token`. The UI opens the activation-code step and verifies through `activation/verify-otp`; resend uses `activation/resend-otp`.
- Normal verified login still establishes the HttpOnly session through the BFF.

The old frontend pilot branch that bypassed SMS when `verification_required=false` is no longer used for registration or password recovery. The value is still accepted from identify for backward compatibility, but the frontend follows the restored OTP contract.

Temporary activation, registration, and reset tokens remain only in component memory. They are not stored in URLs, `localStorage`, or `sessionStorage`.

## OTP behavior

Each send lane has its own server-driven cooldown. `retry_after` from a successful `202` or a `429` controls the relevant button. Registration verification has a separate verify hold, so rate limiting code verification does not incorrectly extend the resend timer.

Errors such as `invalid_otp`, `phone_already_registered`, `invalid_registration`, `invalid_reset_token`, `password_reset_unavailable`, `sms_unavailable`, and server rate limits remain visible without storing temporary tokens.

## Staging smoke checklist

1. Verify `GET http://172.16.16.106/api/ready/` returns `200` from the staging host.
2. Run Next with `BACKEND_ORIGIN=http://172.16.16.106` and `PHONE_AUTH_ENABLED=true`.
3. Fresh phone: request registration code, receive SMS, verify, complete profile, and confirm login/session.
4. Existing verified phone: login normally.
5. Existing unverified phone: login with password, confirm the backend returns `202`, receive activation SMS, verify, and confirm the session is created only after verification.
6. Forgot password: request code, verify it, set a new password, then log in with the new password.
7. Check resend cooldowns and one invalid-code attempt for registration, activation, and reset.
8. Confirm no `activation_token`, `registration_token`, `reset_token`, access token, or refresh token appears in browser storage or the URL.

The UI branch for this cutover is `feature/restore-phone-otp-staging`.
