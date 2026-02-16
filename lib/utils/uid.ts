import {nanoid} from 'nanoid';

// Fallback exists because randomUUID is unavailable in some browsers/webviews.
export function uid(prefix?: string): string {
  const nativeUuid = globalThis.crypto?.randomUUID?.();
  const value = nativeUuid ?? nanoid();

  return prefix ? `${prefix}-${value}` : value;
}
