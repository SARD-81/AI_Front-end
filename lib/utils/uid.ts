import {nanoid} from 'nanoid';

// Fallback exists because randomUUID is unavailable in some browsers/webviews.
export function uid(prefix?: string): string {
  const nativeUuid = globalThis.crypto?.randomUUID?.();
  const value = nativeUuid ?? nanoid();

  return prefix ? `${prefix}-${value}` : value;
}

function randomUuidFromMathRandom(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
    const randomValue = Math.floor(Math.random() * 16);
    const value = token === 'x' ? randomValue : (randomValue & 0x3) | 0x8;

    return value.toString(16);
  });
}

function randomUuidFromCryptoValues(crypto: Crypto): string {
  const values = new Uint8Array(16);
  crypto.getRandomValues(values);
  values[6] = (values[6] & 0x0f) | 0x40;
  values[8] = (values[8] & 0x3f) | 0x80;

  return Array.from(values, (value) => value.toString(16).padStart(2, '0'))
    .join('')
    .replace(
      /(.{8})(.{4})(.{4})(.{4})(.{12})/,
      '$1-$2-$3-$4-$5'
    );
}

export function uuid(): string {
  const crypto = globalThis.crypto;
  const nativeUuid = crypto?.randomUUID?.();
  if (nativeUuid) return nativeUuid;

  if (typeof crypto?.getRandomValues === 'function') {
    return randomUuidFromCryptoValues(crypto);
  }

  return randomUuidFromMathRandom();
}
