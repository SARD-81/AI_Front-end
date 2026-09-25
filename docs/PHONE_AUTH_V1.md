# Phone-first auth (frontend)

The current pilot contract is `SOHA_FRONTEND_PILOT_AUTH_CONTRACT.md`. The backend review named there is `a9564e8`; the staging config note is `1a99539` (2026-09-25). Those commits are not evidence this frontend is deployed, and a green mock test is not a live integration test. Staging smoke is unconfirmed.

## Pilot and a later SMS mode

`PHONE_AUTH_ENABLED=true` turns on the phone-first auth page and the `/api/app/auth/phone/*` BFF routes. Any other value, including an unset variable, shows that sign-in is not available and returns `404 phone_auth_disabled` from the phone routes. It does not open public email sign-in. A frontend flag alone does not allow registration without the server’s `verification_required` boolean.

Identify returns `next` (`password` or `register`) and `verification_required`. A missing or non-boolean `verification_required` is a contract error. It is a server mode, not proof that this number was verified.

- `next=password` opens phone-and-password login only.
- `next=register` with `verification_required=false` opens the account form directly. The body sends `phone_number` and omits `registration_token`. No click, error, back, or restart may open the code steps or call an SMS route.
- `next=register` with `verification_required=true` is the later SMS path: request a code, verify it, then register with `registration_token` and without `phone_number`. That screen is titled «ساخت حساب کاربری جدید», with the steps «شماره تلفن / کد تأیید / ساخت حساب کاربری» directly under the title. It does not offer the old email-account box.

Sending both `phone_number` and `registration_token` is `400 invalid_registration`. Login `200` and register `201` create the existing HttpOnly session. Failures do not. Tokens stay out of the URL, `localStorage`, and `sessionStorage`.

Public email login, email registration, and email password reset are not part of this contract. Direct URLs such as `entry=email` or `mode=signup` stay on the phone number step. The old BFF routes answer `410` and do not call the backend or set a session. With `PHONE_AUTH_ENABLED` off, the auth page says sign-in is not available. It does not show the old email form. Turn the flag on only where the new backend contract is deployed. SMS is not required for this pilot; `verification_required=true` is the later mode.

An optional email on the phone registration form is account data. It is not verified and it is not a way to sign in or recover a password. The migrated-account form appears only after `403 password_change_required`. Its success is `password_updated` with exactly one of `phone_login_required` or `phone_setup_required`, no JWT, and no session cookie. Any other body, including `{}`, both destinations, or a JWT, is a contract error.

Pilot password recovery is the support step. It does not promise a text message or an email. A confirmed public contact channel for that step is still a release dependency; the screen does not invent one and does not discuss that internal gap.

## Enablement

Use the flag only where the backend implements this contract. Leaving it off shows that sign-in is unavailable. It is not a rollback to public email login. SMS delivery is not a prerequisite for the pilot.

## What the browser calls

The browser talks only to same-origin `/api/app/*`. The BFF adds `Authorization: Bearer` from the HttpOnly access cookie. Phone identify, login, activation, registration, and reset bodies are mapped in `lib/server/phone-auth-bff.ts`.

`202` is a successful HTTP status. The BFF reads it explicitly. It means an SMS task was accepted, not that the handset received a message, and it does not set a session cookie.

Cookie lifetime is the JWT `exp` claim minus 30 seconds. If the token has no readable `exp`, the cookie falls back to 60 minutes for access and 12 hours for refresh. Those fallbacks are not treated as the real token lifetime. Refresh requires a rotated refresh token and stores the pair together. A failed or incomplete refresh clears the session.

## Release blockers

- The new phone contract is not an observed deployment. Do not release until `PHONE_AUTH_ENABLED=true` and that backend are both in place. SMS is not required for the pilot. A confirmed public support contact is still missing; do not invent one in the UI.
- A phone-only chat can still reach the AI bridge with `user_id` null. Hiding the send button is not a server guard. Do not describe public AI-on-phone-accounts as ready.
- Legacy `POST /api/auth/register/*` routes stay callable on the server. Hiding them in the phone UI does not disable them.
- There is no self-service endpoint to attach a phone to an old email account. That person is not sent to email login. Support has to attach the number to the same user.
- An open WebSocket is closed in this frontend after logout, email reset complete, phone reset complete, or password change. The server does not close it.

## Countdown and recovery

Each OTP send lane (activation, registration, recovery) stores its own request id and start time. A later `202` or send `429` with the same `retry_after` starts that lane again and leaves the other lanes alone. A `429` from registration verify times only the verify button; it does not extend the resend hold. A later verify `429` with the same `retry_after` starts that verify clock again. The button stays disabled until its own clock reaches zero. `retry_after` comes from the response; the UI does not invent 60 seconds. The accepted-SMS notice is cleared when the verify error is shown.

`phone_already_registered` returns the same number to the password form. An expired registration token can be dropped in memory and the OTP step started again without reloading the page. `invalid_reset_token` and `password_reset_unavailable` return to the recovery code step, where another code can be requested within the server limit. Activation verify `503` `sms_unavailable` clears the activation token and returns to the password form. Temporary tokens stay in component memory only.

Phone login `403` `password_change_required` does not set a session cookie. The phone page shows the migrated-account form. Success returns to phone login or to support and does not create a session. A JWT in that response is a contract error.

## What this branch does not include

The branch base is `main` (`ee949ac`). `origin/design/chat-teal-mobile-v1` is not in this PR, so the chat teal workspace is not part of these screens. The phrase «اولین بار است» is not on `main` or on this branch. It is on `design/auth-entry-teal-v1`: `messages/fa.json` `auth.card.signupDescription` and `auth.card.firstTimeTitle`, rendered by `components/auth/AuthClient.tsx`. History was not rewritten and that branch was not merged.

## Earlier screenshots

The PNGs in `docs/phone-auth-screenshots/` are from an earlier phone-auth pass. They are not pictures of the current pilot or of the later SMS screen. Do not use them as the current version. They were taken with headless Chrome at device scale 1 after the target heading was on the page, against a local mock, not a deployed backend and not a physical device.

Registration shots `register-intent-*`, `register-code-*`, and `register-profile-*` replace the older `phone-register-*` frames, which showed the previous combined card. They were captured against a local mock on `127.0.0.1:8107` that answered identify, request-otp, and verify-otp. That mock is not a deployed backend and not a physical device. The other frames were captured against a local mock on `127.0.0.1:8099`, also not a deployed backend. There was no horizontal overflow.

| File                        | PNG pixels |
| --------------------------- | ---------- |
| `phone-login-320.png`       | 320×900    |
| `phone-login-375.png`       | 375×900    |
| `phone-login-375-dark.png`  | 375×900    |
| `phone-login-412.png`       | 412×900    |
| `phone-login-1280.png`      | 1280×900   |
| `phone-login-1280-dark.png` | 1280×900   |
| `phone-activation-320.png`  | 320×900    |
| `phone-activation-375.png`  | 375×900    |
| `phone-activation-412.png`  | 412×900    |
| `phone-activation-1280.png` | 1280×900   |
| `register-intent-375.png`   | 375×1100   |
| `register-intent-1280.png`  | 1280×1100  |
| `register-code-375.png`     | 375×1100   |
| `register-code-1280.png`    | 1280×1100  |
| `register-profile-375.png`  | 375×1328   |
| `register-profile-1280.png` | 1280×1340  |
| `phone-reset-320.png`       | 320×900    |
| `phone-reset-375.png`       | 375×900    |
| `phone-reset-412.png`       | 412×900    |
| `phone-reset-1280.png`      | 1280×900   |
| `phone-error-320.png`       | 320×900    |
| `phone-error-375.png`       | 375×900    |
| `phone-error-412.png`       | 412×900    |
| `phone-error-1280.png`      | 1280×900   |

Desktop registration before the code, on the code step, and on the profile form is `register-intent-1280.png`, `register-code-1280.png`, and `register-profile-1280.png`. The 375 pair is the mobile width. `phone-login-375.png` and `phone-login-1280.png` are the light document theme. `phone-login-375-dark.png` and `phone-login-1280-dark.png` use `html.dark`. In both themes the university mark stays colored and the login controls stay on the light surface.
