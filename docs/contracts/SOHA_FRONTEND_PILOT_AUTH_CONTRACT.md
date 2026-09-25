# Soha frontend handoff — phone-first pilot

**Backend contract reviewed at `a9564e8`; staging configuration fix reviewed at `1a99539` (2026-09-25).** This describes the temporary pilot with `PHONE_ONLY_AUTH=true`, `ALLOW_UNVERIFIED_PHONE_PILOT=true`, and `SMS_DELIVERY_CONFIGURED=false`. Deployment and end-to-end staging smoke are still pending. JSON examples are illustrative; branch on HTTP status and stable `code`, not Persian `detail` text.

## Product flow

1. Ask for a **mobile number**. This pilot does not offer email as a login identifier. An email is optional on the registration form.
2. Call `POST /api/auth/phone/identify/` with `{ "phone_number": "09123456789" }`.
3. `200 { "next": "password", "verification_required": false }`: show password entry for **that same number**. `200 { "next": "register", "verification_required": false }`: show the new-account form. `verification_required` is a global server mode, not a statement that this particular number has been verified.
4. Successful login or registration returns JWTs and opens the app. **Do not show OTP or SMS resend in pilot mode.** Do not redirect away from the app because `phone_setup_required` is `true`: that value means the saved phone is still unverified.

The backend accepts `09xxxxxxxxx`, `+989xxxxxxxxx`, and `989xxxxxxxxx`, including Persian/Arabic-Indic digits. It stores `09xxxxxxxxx`. Spaces **inside** a phone number are invalid. A bad identify number returns `400` with `code: "invalid_phone_number"`. Identify has no application throttle and reveals only `next` plus the global mode flag.

## Pilot API calls

All paths below are relative to the backend HTTPS origin. Requests and responses are JSON.

| Step | Request | Success | Handle these failures |
| --- | --- | --- | --- |
| Identify | `POST /api/auth/phone/identify/` `{ "phone_number": "09123456789" }` | `200` `{ "next": "password" \| "register", "verification_required": false }` | `400 invalid_phone_number` |
| Existing account | `POST /api/auth/phone/login/` `{ "phone_number": "09123456789", "password": "..." }` | `200` auth payload below, including `access` and `refresh`; no SMS | `401 invalid_credentials` for unknown/wrong password/inactive/locked; `403 password_change_required` for an account requiring initial password setup; `429 login_rate_limited` after account lockout; `400 invalid_login_request` if `email` or `identifier` is sent. Malformed phone on this route is also a generic `401`. |
| New account | `POST /api/auth/phone/register/` with the JSON example below; omit `registration_token` | `201` same auth payload; one new User with a saved but **unverified** phone | `400 invalid_phone_number`, `invalid_registration`, or `invalid_password`; `409 phone_already_registered` or `email_already_registered`; `429 rate_limited` (shared IP backstop). |

Registration request example:

```json
{
  "phone_number": "09123456789",
  "first_name": "علی",
  "last_name": "رضایی",
  "password": "<user-chosen password>",
  "role": "student",
  "email": null
}
```

`first_name`, `last_name`, `password`, and `role` are required; names cannot be whitespace only. Allowed roles: `student`, `professor`, `staff`. Never offer `admin`. For `staff`, optionally send `staff_category` as `faculty_administration`, `vice_presidency`, or `other`; omit it for other roles. `email` may be omitted, `null`, or `""` (stored as `NULL`). A supplied email remains **unverified** and is not a password-recovery channel. Do not collect university IDs yet. Password rules are enforced by the server; `400 invalid_password` carries a list of messages in `detail`. Supplying both `phone_number` and `registration_token` returns `400 invalid_registration`.

New users are profile-complete and can use ordinary chat routes. Choosing `professor` or `staff` grants no administrative or university-verified privileges. A `409` after an earlier `identify: register` is possible if somebody registered the same number meanwhile: run identify again; never create a second user.

Auth payload shape on `200` login and `201` registration:

```json
{
  "access": "<jwt>",
  "refresh": "<jwt>",
  "identifier": null,
  "student_id": null,
  "full_name": "علی رضایی",
  "role": "student",
  "is_profile_completed": true,
  "must_change_password": false,
  "is_locked": false,
  "phone_setup_required": true
}
```

`identifier` and `student_id` may be null. The payload does **not** include `phone_number` or `email`. `GET /api/auth/profile/` with `Authorization: Bearer <access>` returns `email` (possibly null), names, role, and role profile fields; it does not expose a phone verification field. Retain the entered number only as needed for the current login form.

## Session, password, and chat

- Use the frontend repository's **existing BFF/session mechanism**, after its owner confirms its routes and secure-cookie behavior. This backend expects `Authorization: Bearer <access>`; this repository does not define `/api/app/*` BFF endpoints. Do not add browser-side token storage on an assumption.
- Access lifetime defaults to 60 minutes; refresh defaults to 12 hours. Use JWT `exp` rather than a hardcoded timer. `POST /api/auth/refresh/` with `{ "refresh": "<jwt>" }` returns rotated `access` and `refresh`; replace both together. On a failed refresh, end the session. `POST /api/auth/logout/` with `{ "refresh": "<jwt>" }` blacklists the refresh and returns `205`; close the client's WebSocket.
- An authenticated user changes a known password through `POST /api/auth/password/change/` with `{ "current_password": "...", "new_password": "..." }`. Success: `200 { "status": "password_changed" }`; log in again because existing JWTs are revoked. Relevant failures: `400 invalid_current_password`, `invalid_password`, or `password_unchanged`; `403 account_unavailable`; `429 rate_limited`.
- **Forgot password in this pilot:** an unverified phone gets `400 phone_not_verified` from `POST /api/auth/phone/password-reset/request-otp/`; SMS is off. Offer a support/contact path instead of promising an SMS reset. A supplied but unverified email cannot receive email recovery either. Support must reset the password on the **original User**, not create a replacement account.
- `GET /api/conversations/` and `POST /api/conversations/` work with the access token. `POST /api/chat/ws-ticket/` with that token returns `200 { "ticket": "<opaque>", "expires_in": 30 }`; connect promptly to `wss://<backend-host>/ws/chat/<conversation_uuid>/?ticket=<ticket>`. The ticket is single-use. This staging backend has no AI service: test conversation and socket wiring, but do not expect an assistant answer.

## Legacy users and cutover

`identify: register` means **this number is not on any User row**, not that the person has no older email account. Existing users whose phone has not been attached to their original row must be handled by the team's manual account update; there is no self-service attach endpoint. Do not guide them into a second account. Public email registration is disabled (`410 legacy_registration_disabled`). Under `PHONE_ONLY_AUTH=true`, the old email login does not issue JWTs; for an existing user with a saved phone it returns `410 phone_login_required`, and with no saved phone it returns `403 phone_setup_required` after a correct password.

For an imported account returning `403 password_change_required`, support the existing `POST /api/auth/set-initial-password/` request `{ "email": "...", "temporary_password": "...", "new_password": "...", "new_password_confirm": "..." }`. In phone-only mode its `200` response is `password_updated` with `phone_login_required` when a phone is attached, or `phone_setup_required` when no phone is attached; **it issues no JWT**. With a phone attached, return to phone login. Without one, support must attach it to this same User. Do not expose this form to ordinary new signups.

When SMS is ready, the backend will set `ALLOW_UNVERIFIED_PHONE_PILOT=false` **after** enabling a working provider. Then `identify.verification_required` becomes `true`. An existing unverified user enters phone + password, receives `202 phone_verification_required` with `activation_token`, verifies by `POST /api/auth/phone/activation/verify-otp/` using `{ "activation_token": "...", "code": "123456" }`, and stays on the same User. New accounts instead use `POST /api/auth/phone/registration/request-otp/` (`phone_number`), `POST /api/auth/phone/registration/verify-otp/` (`phone_number`, `code`), then `POST /api/auth/phone/register/` with the returned `registration_token` instead of `phone_number`. At this cutover, old pilot JWTs cease to work; prompt for re-authentication and reconnect WebSockets. Do not treat a pilot phone as verified before that OTP succeeds.

## Frontend acceptance checks

- A new number goes from identify to direct registration to the app, with optional email and no OTP screen.
- A returning number goes from identify to password to the app; wrong password does not open a session.
- `phone_setup_required: true` does not loop or block an authenticated pilot user.
- Duplicate phone/email (`409`), weak password (`400` with list details), lockout (`429` with `retry_after` when supplied), and expired session have clear UI paths.
- Forgotten password shows the pilot support path. Changing a known password ends the old session.
- Chat HTTP, ticket, and WebSocket work with the new account. Assistant replies require a separately connected AI service.
- An old email-only User is never silently replaced with a new User.

**Release note:** This contract is based on the local code patch, not an observed deployment. Verify these checks against the final staging build and the frontend BFF before calling the integration complete.
