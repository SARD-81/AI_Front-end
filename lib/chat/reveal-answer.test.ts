import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revealAnswerProgressively } from './reveal-answer';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('word-paced answer reveal', () => {
  it('preserves the exact Markdown, whitespace and Persian half-spaces with slower word steps', async () => {
    const text =
      '  **سلام** دانشجوی تازه‌وارد!\n\n| درس | زمان |\n| --- | --- |\n| برنامه‌نویسی | شنبه |\n';
    const token = vi.fn();
    const pending = revealAnswerProgressively(text, token);
    expect(token).toHaveBeenCalledTimes(1);
    expect(token.mock.calls[0][0]).toBe('  **سلام** ');
    await vi.advanceTimersByTimeAsync(54);
    expect(token).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(token).toHaveBeenCalledTimes(2);
    await vi.runAllTimersAsync();
    await pending;
    expect(token.mock.calls.map(([chunk]) => chunk).join('')).toBe(text);
  });

  it('caps the extra reveal time for long answers at 4.4 seconds', async () => {
    const text = 'واژه '.repeat(2000);
    const token = vi.fn();
    const done = vi.fn();
    const pending = revealAnswerProgressively(text, token).then(done);
    await vi.advanceTimersByTimeAsync(4400);
    await pending;
    expect(done).toHaveBeenCalledOnce();
    expect(token.mock.calls.map(([chunk]) => chunk).join('')).toBe(text);
  });

  it('stops immediately during a word delay without emitting later words', async () => {
    const controller = new AbortController();
    const token = vi.fn();
    const pending = revealAnswerProgressively(
      'کلمه '.repeat(30),
      token,
      controller.signal
    );
    const rejected = expect(pending).rejects.toMatchObject({ code: 'ABORTED' });
    controller.abort();
    await rejected;
    await vi.runAllTimersAsync();
    expect(token).toHaveBeenCalledTimes(1);
  });

  it('skips animation for reduced motion and short answers', async () => {
    const token = vi.fn();
    await revealAnswerProgressively('کوتاه', token);
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    await revealAnswerProgressively('کلمه '.repeat(30), token);
    expect(token).not.toHaveBeenCalled();
  });
});
