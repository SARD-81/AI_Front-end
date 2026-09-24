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

Screenshots in `docs/phone-auth-screenshots/` were taken against a local mock of the contract, not a deployed backend. Viewport checks at 320, 375, 412, and 1280 CSS pixels found no horizontal overflow, 16px inputs, and buttons at least 44px tall. That is not a physical-device test.
