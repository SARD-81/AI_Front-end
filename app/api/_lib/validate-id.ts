const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PLACEHOLDER_VALUES = new Set([
  'id',
  '<id>',
  ':id',
  '{id}',
  '__id__',
  '[id]'
]);

const INVALID_CHAT_ID_MESSAGE =
  'Invalid chat id. Replace <id> with a real UUID from GET /api/app/chats.';

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function validateChatId(id: string): string | null {
  const normalizedId = safeDecode(id).trim();
  const lowerId = normalizedId.toLowerCase();

  if (!normalizedId) {
    return INVALID_CHAT_ID_MESSAGE;
  }

  if (
    normalizedId.includes('<') ||
    normalizedId.includes('>') ||
    normalizedId.startsWith(':') ||
    normalizedId.includes('{') ||
    normalizedId.includes('}')
  ) {
    return INVALID_CHAT_ID_MESSAGE;
  }

  if (PLACEHOLDER_VALUES.has(lowerId)) {
    return INVALID_CHAT_ID_MESSAGE;
  }

  if (!UUID_REGEX.test(normalizedId)) {
    return INVALID_CHAT_ID_MESSAGE;
  }

  return null;
}
