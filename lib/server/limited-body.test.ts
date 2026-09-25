import { describe, expect, it } from 'vitest';
import { readJsonBody } from '@/lib/server/limited-body';

describe('readJsonBody', () => {
  it('parses a small JSON body', async () => {
    const request = new Request('http://localhost/api', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'سلام' })
    });
    await expect(readJsonBody(request)).resolves.toEqual({ title: 'سلام' });
  });

  it('rejects a declared content-length above the ceiling', async () => {
    const request = new Request('http://localhost/api', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '999999'
      },
      body: JSON.stringify({ title: 'x' })
    });
    await expect(readJsonBody(request, 100)).rejects.toMatchObject({
      status: 413,
      code: 'request_body_too_large'
    });
  });

  it('rejects a chunked body with no content-length once the ceiling is passed', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"a":"'));
        controller.enqueue(new TextEncoder().encode('yyyyyyyyyy"}'));
        controller.close();
      }
    });
    const request = new Request('http://localhost/api', {
      method: 'POST',
      body: stream,
      duplex: 'half'
    } as RequestInit);
    await expect(readJsonBody(request, 8)).rejects.toMatchObject({
      status: 413,
      code: 'request_body_too_large'
    });
  });

  it('stops a small body that never finishes', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{'));
      }
    });
    const request = new Request('http://localhost/api', {
      method: 'POST',
      body: stream,
      duplex: 'half'
    } as RequestInit);
    await expect(readJsonBody(request, 100, 40)).rejects.toMatchObject({
      status: 408,
      code: 'request_body_timeout'
    });
  });
});
