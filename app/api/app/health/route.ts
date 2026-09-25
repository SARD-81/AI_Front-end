import {NextResponse} from 'next/server';

// Process liveness for the Next.js container. This must not call Django:
// a backend outage should fail readiness, not restart this process.
export async function GET() {
  return NextResponse.json(
    {status: 'live'},
    {headers: {'Cache-Control': 'no-store'}}
  );
}
