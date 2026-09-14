# Faculty branding and response feedback — 2026-09-14

Follow-up to merged PR #126, based on main `5fb028fc2273b10bea5911ee34f20ac11e0b2310`.
Continues on `fix/chat-composer-status-and-branding` for a new PR.

## Changes

- Shared university mark has no background, padding, border or shadow. The original
  PNG and its transparency are preserved. CSS `brightness(0) invert(1)` provides
  an exact white silhouette on dark surfaces, without redrawing the university seal.
  Chat and sidebar follow the theme. The auth hero is permanently dark, so its
  mark stays white to remain legible regardless of the application's theme.
- Auth and empty-chat logo frames are 2rem smaller in each dimension at their
  existing breakpoints. The sidebar mark uses a 44px frame and the same transparent
  margin crop as the other marks, replacing the old padded 36px white box.
- The sidebar footer reserves bottom placement with `margin-top: auto` even when
  the collapsed conversation list is hidden. Its collapsed profile trigger is
  horizontally centered within the footer.
- A shared, localized faculty label and beta badge appear in the chat footer and
  auth hero. Introductory copy explicitly identifies the intended faculty.
- Six localized suggestions cover first-term registration, enrollment/exam dates,
  academic advisers, classroom schedules, prerequisites and faculty introductions.
  The existing direct-submit behavior is preserved.
- A single pending status changes at 60, 120 and 180 seconds, with contextual copy,
  motion-sensitive decoration and elapsed time. It does not invent backend progress.
  The timer lives above virtual rows, uses wall-clock elapsed time, updates when the
  tab becomes visible, and is cleaned up/reset when waiting ends. Per-second clock
  updates are hidden from screen readers; stage changes remain politely announced.
- The answer timeout is increased from 150 to 240 seconds **per WebSocket attempt**
  so the three-minute state can be reached. Connection timeout, retry policy,
  authentication, message IDs, payloads and server error handling are unchanged.
  A server timeout can still end waiting earlier; this does not override backend limits.
- Simulated streaming now reveals whole-word groups every 55ms (previously 28ms
  character chunks), bounded to 4.4 seconds of added delay (previously 2.2 seconds).
  It preserves Markdown, whitespace and Persian half-spaces. Reduced-motion and
  short-answer bypasses remain; abort interrupts a pending delay immediately.

## Verification

- `npm test`: 73 tests pass across 21 files, including the existing submission,
  retry, cancellation, direction and single-status regressions from PR #126.
- New coverage checks all three wait thresholds and reset, exact answer fidelity,
  pacing and duration cap, immediate abort, reduced motion, a response arriving
  after three minutes, and finite socket timeout with cancellation of retries.
- `npm run lint`: no ESLint warnings or errors. `npx tsc --noEmit` passes.
- `npm run build`: production compilation and all 33 static pages succeed.
- Browser geometry remains unverified: the available browser blocks the local
  preview, and the remote preview requires Vercel authentication. Component tests
  use a virtual-list test double; no live backend or screenshot verification is claimed.

## Remaining visual acceptance

Check Persian/English, light/dark, mobile/desktop and short viewports: transparent
logos remain legible, the collapsed profile trigger stays centered at the bottom,
footer copy wraps without hiding the composer, and the six suggestions submit the
selected question. With a delayed backend, check each minute boundary, scroll away
and back, switch tabs, stop, retry and send another question; the single waiting
status should reset and disappear once answer reveal begins.
