# Disappearing exchanges — 2026-09-19

Baseline: main `cb9471925a3f12b1114f1990d1687e44f42ccda9` (merged #128).

## Evidence and limits

The supplied video shows a newly displayed answer replaced by older conversation
content. The backend developer reports that persistence commits before WebSocket
delivery. No production network capture or database access was available, so the
exact HTTP payload and deployed revision behind this recording are not proven.

The current frontend has a reproducible loss path independent of database commit
timing: `useSendMessage` commits the received exchange; `ChatShell` immediately
invalidates the active detail query; `getConversation` fetches only one messages
page and replaces the whole detail cache with it. An empty/stale page or a first
page excluding the newest exchange removes the already displayed question/answer.
Persisting before delivery does not guarantee that the first history page contains
the newest messages. Existing shell tests mocked `invalidateQueries` to a no-op,
which concealed this path. The new post-send regression fails on the baseline with
the submitted question missing, and passes with this fix.

## Fix

- Treat the received WebSocket exchange as committed. Refresh only conversation
  list metadata after success, without an immediate destructive detail refetch.
- Follow all `nextCursor` pages before resolving a history snapshot. Keep server
  order, deduplicate overlapping IDs, reject repeated cursors and propagate a
  later-page failure instead of returning partial history as a successful result.
- Pass the query AbortSignal through detail/page requests. Cancel older reads
  before optimistic insertion and before final commit, without reverting cache
  writes. If a background snapshot already omitted the local question during the
  wait, restore that question when committing the successful exchange.
- Keep cancellation, explicit regenerate/edit, no-send-retry behavior, WebSocket
  contract and backend authentication unchanged. No persistent merge retaining
  deleted messages, polling, arbitrary delay or localStorage history is introduced.

## Validation

Eight new regressions cover post-send retention, reads begun before/during sending,
both response completion orders, multi-page history, overlapping IDs, page failure,
cursor loops and cancellation. The shell tests now exercise actual invalidation.
See the PR for final full-suite, lint, typecheck and build results.

Live acceptance: use a conversation exceeding the backend page size, send a new
question, wait for full reveal, wait several seconds, then reload/reopen it. The
latest pair must remain. Repeat with slow history GETs, Stop and a failed send.
Inspect Network to verify no immediate detail refetch after send and all cursor
pages fetched on reopen. The frontend does not issue message deletion requests.

Trade-off: loading a complete history performs one GET per cursor page before
publishing the snapshot. This favors correctness within the existing complete-list
UI. Very large histories should later use an explicit paginated UI rather than
silently treating one page as the entire conversation.
