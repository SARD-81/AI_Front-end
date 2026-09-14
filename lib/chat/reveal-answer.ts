import { ChatWebSocketError } from '@/lib/services/chat-service';

const REVEAL_TICK_MS = 55;
const REVEAL_MAX_MS = 4400;
const REVEAL_MIN_LENGTH = 48;

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new ChatWebSocketError('Response generation was stopped.', 'ABORTED');
  }
}

/** Reveal whole words without altering whitespace, Markdown, or Persian ZWNJs. */
export async function revealAnswerProgressively(
  text: string,
  onToken?: (chunk: string) => void,
  signal?: AbortSignal
) {
  assertNotAborted(signal);
  if (!onToken || text.length < REVEAL_MIN_LENGTH) return;
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
    return;

  const words = text.match(/\s*\S+\s*/gu) ?? [text];
  const maxSteps = Math.floor(REVEAL_MAX_MS / REVEAL_TICK_MS);
  const groupSize = Math.max(1, Math.ceil(words.length / maxSteps));

  for (let index = 0; index < words.length; index += groupSize) {
    assertNotAborted(signal);
    onToken(words.slice(index, index + groupSize).join(''));
    await new Promise<void>((resolve, reject) => {
      const finish = () => {
        signal?.removeEventListener('abort', abort);
        resolve();
      };
      const timer = setTimeout(finish, REVEAL_TICK_MS);
      const abort = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        reject(
          new ChatWebSocketError('Response generation was stopped.', 'ABORTED')
        );
      };
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
    });
  }
  assertNotAborted(signal);
}
