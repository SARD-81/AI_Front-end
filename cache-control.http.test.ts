import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';

const port = 3998;
const base = `http://127.0.0.1:${port}`;
let server: ChildProcess | undefined;

async function start() {
  if (!existsSync('.next/BUILD_ID')) {
    throw new Error(
      'Production build is missing. Run npm run build before this HTTP test.'
    );
  }
  server = spawn(
    'npx',
    ['next', 'start', '-H', '127.0.0.1', '-p', String(port)],
    {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  let log = '';
  server.stdout?.on('data', (chunk) => {
    log += chunk.toString();
  });
  server.stderr?.on('data', (chunk) => {
    log += chunk.toString();
  });
  const deadline = Date.now() + 30_000;
  while (!log.includes('Local:') && Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(log);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!log.includes('Local:')) throw new Error(log || 'Next did not start');
}

afterAll(() => {
  server?.kill();
});

describe.skipIf(process.env.CACHE_HEADER_HTTP !== '1')(
  'BFF cache headers',
  () => {
    it('keeps public image caching off every /api/app response', async () => {
      await start();
      const imageApi = await fetch(`${base}/api/app/conversations/test.png`);
      const normalApi = await fetch(`${base}/api/app/conversations`);
      const staticFile = await fetch(`${base}/Logo.svg`);

      expect(imageApi.headers.get('cache-control')).toBe('private, no-store');
      expect(normalApi.headers.get('cache-control')).toBe('private, no-store');
      expect(staticFile.headers.get('cache-control')).toBe(
        'public, max-age=86400, stale-while-revalidate=604800'
      );
      expect(imageApi.headers.get('cache-control')).not.toContain('public');
    });
  }
);
