# BFF resource limits

In-process limits below are a backstop. They do not replace Nginx/ingress or Django rate limits.

## Next.js BFF

- Ordinary backend HTTP calls abort after 15s (`BACKEND_HTTP_TIMEOUT_MS`).
- One history page may take 20s. That is not the WebSocket or model-generation lifetime. Chat answers travel on the WebSocket after a short ticket request.
- Caller abort (`request_aborted`, 499) is separate from `backend_timeout` (504).
- Backend responses are capped at 1 MiB, including chunked bodies with no `Content-Length`.
- JSON mutation bodies are capped at 64 KiB (`request_body_too_large`, 413).
- 400, 401, 403 and 429, including `retry_after`, keep their existing contract.

## Ingress (required before a university release)

Set these on the proxy in front of Next, not only inside Node:

- `client_max_body_size 64k;` for `/api/app/`
- proxy read timeout above the 20s history budget and below the orchestration kill timeout
- `limit_conn` per client IP on the public edge
- do not point liveness at Django; see `docs/probes.md` once that note lands

Confirm the real TLS-terminating proxy before treating these numbers as deployed.
A passing local Cache-Control check does not prove a CDN or reverse proxy will
keep that header; the deployed edge must be tested separately.
