# Release blockers

Items below are not closed by this repository. A green `npm test` or `next build` is not evidence of capacity or of a deployed control.

## Closed in this frontend, still needing a deployed check

| Item | What this repo did | Still required |
| --- | --- | --- |
| Cookie mutation origin | State-changing `/api/app` routes reject a foreign origin, a same-site subdomain, and a missing Origin unless `Sec-Fetch-Site` is `same-origin`. | Set `PUBLIC_APP_ORIGIN` to the browser origin after TLS termination. Host and `X-Forwarded-Host` are ignored. Until the real proxy headers are confirmed, this stays a release blocker. |
| BFF time and size | 15s ordinary HTTP, 20s per history page, 1 MiB response, 64 KiB JSON body. Caller abort is `request_aborted`. | Ingress `client_max_body_size`, proxy timeouts, and connection limits. See `docs/bff-limits.md`. |
| Secure cookies | `NODE_ENV=production` forces `Secure`. Local HTTP may still set `AUTH_COOKIE_SECURE=false`. | Confirm the public site is HTTPS before production. |
| Liveness | `GET /api/app/health` does not call Django. | Point the Next.js restart probe at health and traffic at `/api/app/ready`. See `docs/probes.md`. |
| Personal responses | `/api/app/*` sends `Cache-Control: private, no-store`. Image files keep their own public cache. | Keep CDN caching on static files only. |

## Blocked on backend or proxy

- **History.** `CHAT_HISTORY_MODE` stays `compat`. Do not enable `latest-first` until the backend contract in `docs/chat-history.md` is deployed and tested. The 25-page scan ceiling is only a temporary BFF stop; it is not the capacity fix.
- **Refresh across instances.** `lib/server/with-refresh.ts` deduplicates refresh only inside one Node process. A second instance with the same refresh cookie can rotate or reject a one-time refresh token. Do not treat sticky sessions or another in-memory `Map` as the fix. The backend owner must provide idempotent refresh or a controlled grace period. Concurrent refresh must not log the user out, must not leave a rotated invalid token in the cookie, and must not clear the session on 429 or 5xx. This repo's unit tests cover one process only.
- **Login refresh contract.** `normalizeBackendAuthContract` treats `refresh` as optional, while chat and profile pages redirect unless the `sbu_refresh` cookie is present. Do not change that validation until the deployed login response is shown to always include a refresh token.
- **Client IP and rate limits.** `TRUST_PROXY_CLIENT_IP` stays off unless the proxy overwrites `X-Real-IP` and Next.js is not reachable directly. If every student is seen as the BFF address, Django IP limits do not separate users. OTP, login, ticket, and model calls need limits at the real edge, keyed by user or a trusted client address. This process does not provide a distributed limiter.
- **WebSocket ticket.** The ticket is placed on the WebSocket URL and can land in access logs. Redact the query string in Nginx/ingress and in the backend before release. Ticket lifetime, single use, binding to the user and conversation, per-message authorization, and revocation when the session ends are backend tests. They are not proven here.
- **Authorization.** Hiding an admin menu is not access control. Student, staff, and admin accounts must be tested with direct ids against Django for lock/unlock, reports, another user's conversation, and another user's message. This frontend forwards the caller cookie; it does not decide those permissions.
- **Phone auth.** Leave `PHONE_AUTH_ENABLED=false` until the phone contract, SMS worker, and the `user_id=null` model path are confirmed. The older email registration routes remain in the tree.
- **CSP and HSTS.** Fonts are local (`Vazirmatn`, `Lalezar` via `next/font/local`). No third-party script host was found. An enforcing CSP was not added, because Next's inline bootstrap was not verified in a deployed HTTPS browser. Do not set HSTS `includeSubDomains` until the infrastructure owner confirms every subdomain is HTTPS.

## Observability to define before load

Record, without logging passwords, OTP, JWT, refresh tokens, WebSocket tickets, or full chat text:

- BFF latency, error rate, 429 rate, timeout rate, in-flight requests
- active WebSocket count where the backend exposes it
- failed refresh count
- process CPU and memory

Pass a request id that is not a student identifier. No numeric SLO is set here; the load script refuses to run until those targets are supplied.

- **Dependencies.** `npm audit --omit=dev --audit-level=high` is a separate CI job. On 2026-09-25 it reports critical Next.js advisories GHSA-p293-qw3h-jr36 and GHSA-2xp9-vwfh-vxw4, high PostCSS and sharp issues, and moderate next-intl issues. `npm audit fix` rewrites a large part of the lockfile, so it was not applied. This audit job is expected to fail until a reviewed upgrade lands. Local `npmmirror` cannot serve the advisory API.

## Capacity

There is no evidence in this repository for 10–15 thousand concurrent users. Use `scripts/staging-capacity-plan.mjs` only against a staging host, and only after SLO values are agreed.
