# Typography and single-attempt sends — 2026-09-14

Based on branch commit `571dbd8163e9019d02b93458c7a240ed027d05b6`.
PR #127 was still open; the replacement PR includes its existing changes.

## Typography
- Vendor Google Fonts' Lalezar Regular with its SIL OFL license, using next/font/local.
  Upstream font blob: `b4dfd64d62313abebd2e6a0fef81412ab231f045`.
- Apply only to Persian auth hero and empty-chat headings. Its real weight is 400.
  Body text, chat Markdown, inputs and English typography retain their current font.
- Use bold Vazirmatn for the sidebar university name, new-chat and search labels.

## Sending
- Remove all WebSocket retry counters, backoff timers, retry-code lists and duplicate
  replay. One send calls the ticket endpoint once and opens at most one socket.
- Preserve handshake validation, UUID, four-minute answer deadline, error mapping
  and cancellation. A duplicate-in-progress acknowledgement now surfaces an error.
- Explicitly disable TanStack retries for send and lazy conversation creation,
  including when a QueryClient supplies mutation retry defaults.
- Remove failed-message Retry controls and callbacks. Restore-to-input remains an
  editing action and does not send anything. Explicit regeneration of a successful
  answer remains a separate user action. Authentication refresh and read-query
  retry policy are outside message replay and remain unchanged.
- Update the third-minute copy so it no longer promises a Retry button.

## Verification
Local execution is unavailable in this session. A read-only-permission GitHub
Actions job runs npm ci, the full Vitest suite, ESLint and the production build.
Do not interpret the prior PR's passing tests as validation of this revision.
New transport regressions cover server failures, duplicate acknowledgements,
ticket 503, early close, handshake timeout and answer timeout with no second
ticket/socket. DOM regressions verify no Retry action and retained Restore.
The shell suite supplies retry-enabled mutation defaults to verify per-send opt-out.

Visual acceptance: check Persian headings and bold sidebar labels in both themes,
expanded/collapsed sidebar and narrow screens. Confirm font loading from the app's
own origin. Simulate failure/timeout: one submission only, error shown, original
question retained, Restore fills the input without sending, Stop still works.
