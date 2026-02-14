import { API_BASE_URL } from '@/data/http/endpoints';

const parseBool = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) return fallback;
  return value === '1' || value.toLowerCase() === 'true';
};

export const env = {
  demoMode: parseBool(process.env.NEXT_PUBLIC_DEMO_MODE, true),
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || API_BASE_URL,
  streamParser: process.env.NEXT_PUBLIC_STREAM_PARSER || 'text',
};
