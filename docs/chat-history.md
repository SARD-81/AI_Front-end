# Incremental chat history and source reading

## Browser behavior

The chat detail cache holds the visible chronological window, its opaque older-page
cursor, and a virtual-list start index. A newly opened conversation requests its
metadata and **one history window of at most 10 messages**, concurrently. Each
upward load prepends at most 10 older messages. Ten messages include both roles,
not ten question/answer pairs. Loaded pages remain cached during the session.

The virtual list starts at the bottom, uses message IDs as keys and decrements
`firstItemIndex` by the number of unique messages actually prepended. The top
threshold is 120px, gated on user interaction to avoid draining history on mount.
The explicit top button supports keyboard use and manual recovery from a read
failure. Prepending does not trigger the new-question auto-scroll effect. A
received answer does not force a reader browsing older messages to the bottom.

Page requests use separate query keys and deduplicate concurrent requests. A
functional cache update retains new user/assistant messages, ignores duplicate
page completions and deduplicates overlapping IDs. Loaded windows do not silently
reset to the latest page on mount/reconnect/focus. Fresh page reloads obtain a new
window. There is no cross-device live history subscription.

The disappearing-message fix remains: no immediate detail refetch after a send,
old reads are cancelled, and committed WebSocket exchanges are retained. No
message-send retries have been reintroduced. Manual recovery only reads history.

## Backend modes: do not confuse browser pagination with database pagination

`GET /api/app/conversations/{id}/history?cursor=...` returns
`{results: [...], olderCursor: string | null}` in chronological display order.
Cursors are opaque to the browser. This route uses the existing authenticated
backend boundary, does not follow upstream link hosts, and sends no-store headers.

### Default: `CHAT_HISTORY_MODE=compat`

The available repository does **not** prove that Django supports a tail query or
configurable page size. The safe default scans its existing cursor pages on the
BFF, sorts/deduplicates the records and returns only the requested 10-message
window to the browser. Its cursor identifies the boundary message rather than an
offset, so new arrivals do not shift older windows. Missing boundaries fail with
409 rather than silently skipping history. Failed pages/cursor loops fail the
request without replacing already displayed messages.

**Limitation:** this saves browser transfer/rendering and implements the requested
UI, but still reads legacy history on the BFF for each window. It is not a database
or backend-query optimization. No shared history cache is introduced (avoiding
cross-user caching and stale snapshots). Very long production histories should
use the native contract below.

### Efficient path: `CHAT_HISTORY_MODE=latest-first`

Enable only after the backend owner confirms and tests all of:

- `GET /api/conversations/{id}/messages/?page_size=10&ordering=-created_at`
  returns the newest at most ten records, newest first.
- `next` contains a cursor leading to strictly older pages with stable tie-breaking
  for equal timestamps; new arrivals must not shift existing cursor boundaries.
- The requested ordering/page size apply on subsequent cursor requests too.
- The endpoint still enforces conversation ownership and provides `id`, role,
  content, timestamp, feedback and source metadata for each message.

In native mode, each browser window costs exactly one backend history GET (plus
one metadata GET on initial open). The BFF reverses the page for display, validates
its size/order and passes only the encoded cursor upstream. A backend silently
ignoring size/order fails validation rather than presenting a truncated history.
Do not enable this mode based only on query parameter names; verify actual output.
Changing the mode requires reloading already open conversations.

## Sources

The source dialog now has a fixed heading/search area, one scroll region, grouped
source cards, native accessible disclosure controls and readable full excerpts.
Grouping includes dataset identity so similarly named documents from different
collections do not merge. All distinct retrieved segments are retained; the old
highest-score-only grouping discarded other relevant excerpts. Search includes
titles, dataset names and all excerpts, with Persian/Arabic letter normalization.
No fabricated document links or confidence percentages are shown. Empty text,
long unbroken content, Persian/English and light/dark styles are supported.

## Verification and live acceptance

Regression tests cover windows/new arrivals, native query forwarding and order,
malformed cursors/loops/failures, overlapping IDs, concurrent loads while sending,
error retention/no automatic retries, top interaction gating and source search.

Browser acceptance on the deployed app: open a 25+ message conversation, verify
10 -> 20 -> remainder while scrolling up; check the same visible message stays
anchored, send while loading older, navigate between conversations, interrupt a
history request, and test short/tall messages. Check source dialogs in Persian and
English at mobile/desktop sizes, keyboard focus/Escape, dark mode and very long
excerpts. Automated component tests cannot prove actual scroll geometry.
