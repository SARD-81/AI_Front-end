# Phone-first auth (frontend)

This flow follows the local backend contract at commit `9d682db65945d3dd1d9bae7e151edff40ab8158c` on `phase-1-phone-schema`. That commit is not evidence the API is deployed. Do not treat a green mock test as a live integration test.

## Enablement

`PHONE_AUTH_ENABLED=true` turns on the phone-first auth page and the `/api/app/auth/phone/*` BFF routes. Any other value, including an unset variable, keeps the existing email auth UI and returns `404 phone_auth_disabled` from the phone routes.

Use it only in an environment whose backend actually implements the phone contract. Production must stay off until that deploy, the SMS worker, and the AI user-id blocker below are done.

Rollback is turning the variable off and redeploying this frontend. No phone token is stored in the browser outside component memory. Access and refresh stay in HttpOnly cookies.

## What the browser calls

The browser talks only to same-origin `/api/app/*`. The BFF adds `Authorization: Bearer` from the HttpOnly access cookie. Phone identify, login, activation, registration, and reset bodies are mapped in `lib/server/phone-auth-bff.ts`.

`202` is a successful HTTP status. The BFF reads it explicitly. It means an SMS task was accepted, not that the handset received a message, and it does not set a session cookie.

Cookie lifetime is the JWT `exp` claim minus 30 seconds. If the token has no readable `exp`, the cookie falls back to 60 minutes for access and 12 hours for refresh. Those fallbacks are not treated as the real token lifetime. Refresh requires a rotated refresh token and stores the pair together. A failed or incomplete refresh clears the session.

## Release blockers

- The phone backend in the contract is local-only until it is deployed with SMS delivery configured.
- A phone-only chat can still reach the AI bridge with `user_id` null. Hiding the send button is not a server guard. Do not describe public AI-on-phone-accounts as ready.
- Legacy `POST /api/auth/register/*` routes stay callable on the server. Hiding them in the phone UI does not disable them.
- There is no self-service endpoint to attach a phone to an old email account. The UI points that person to email login and support or the planned migration.
- An open WebSocket is closed in this frontend after logout, email reset complete, phone reset complete, or password change. The server does not close it.

## Countdown and recovery

Each OTP lane (activation, registration, recovery) stores its own request id and start time. A later `202` or `429` with the same `retry_after` starts that lane again. The other lanes are left alone. The button stays disabled until that lane's clock reaches zero. `retry_after` comes from the response; the UI does not invent 60 seconds.

`phone_already_registered` returns the same number to the password form. An expired registration token can be dropped in memory and the OTP step started again without reloading the page. `invalid_reset_token` and `password_reset_unavailable` return to the recovery code step, where another code can be requested within the server limit. Activation verify `503` `sms_unavailable` clears the activation token and returns to the password form. Temporary tokens stay in component memory only.

Phone login or activation verify `403` `password_change_required` does not set a session cookie. The screen says `set-initial-password` needs the university email and the temporary password, and points people who have those to the existing email form. It does not invent a phone path. People who do not have them are sent to support or migration.

## What this branch does not include

The branch base is `main` (`ee949ac`). `origin/design/chat-teal-mobile-v1` is not in this PR, so the chat teal workspace is not part of these screens. The phrase «اولین بار است» is not on `main` or on this branch. It is on `design/auth-entry-teal-v1`: `messages/fa.json` `auth.card.signupDescription` and `auth.card.firstTimeTitle`, rendered by `components/auth/AuthClient.tsx`. History was not rewritten and that branch was not merged.

## Screenshots

These PNGs were taken in a browser with `Emulation.setDeviceMetricsOverride` at device scale 1, against a local mock of the contract on `127.0.0.1:8099`. They are not a live backend test and not a physical-device test. Measured CSS viewports had no horizontal overflow, inputs at 16px, and buttons at least 44px. Disabled phone fields stay white with `#073044` text.

| File | PNG pixels |
| --- | --- |
| `phone-login-320.png` | 320×900 |
| `phone-login-375.png` | 375×812 |
| `phone-login-412.png` | 412×812 |
| `phone-login-1280.png` | 1280×860 |
| `phone-activation-320.png` | 320×900 |
| `phone-activation-375.png` | 375×900 |
| `phone-activation-412.png` | 412×860 |
| `phone-activation-1280.png` | 1280×860 |
| `phone-register-320.png` | 320×1040 |
| `phone-register-375.png` | 375×980 |
| `phone-register-412.png` | 412×860 |
| `phone-reset-320.png` | 320×900 |
| `phone-reset-375.png` | 375×900 |
| `phone-reset-412.png` | 412×860 |
| `phone-reset-1280.png` | 1280×860 |
| `phone-error-320.png` | 320×900 |
| `phone-error-375.png` | 375×900 |
| `phone-error-412.png` | 412×860 |
| `phone-error-1280.png` | 1280×860 |

Registration at 1280 CSS px was measured in the page (`innerWidth` 1280, `scrollWidth` 1280, one heading). The screenshot buffer repeated a narrow strip, so that PNG was not kept.
