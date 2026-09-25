# Probes

| Probe | Endpoint | Depends on Django |
| --- | --- | --- |
| Liveness | `GET /api/app/health` | No. Returns `{status: "live"}` when the Next.js process can answer. |
| Readiness | `GET /api/app/ready` | Yes. Forwards the backend ready payload, including a 503 when dependencies are down. |

Orchestration must use liveness for the Next.js restart probe and readiness for traffic. Pointing liveness at `/api/app/ready` or at Django will restart Next.js during a temporary backend failure.

Neither probe is a capacity test.
