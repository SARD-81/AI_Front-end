'use client';

import {useEffect, useState} from 'react';
import type {ThinkingLevel} from '@/lib/api/chat';

const THINKING_LEVEL_STORAGE_KEY = 'thinking_level';

export function useThinkingLevel(defaultValue: ThinkingLevel = 'standard') {
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>(defaultValue);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedLevel = window.localStorage.getItem(THINKING_LEVEL_STORAGE_KEY);
      if (storedLevel === 'standard' || storedLevel === 'low' || storedLevel === 'medium' || storedLevel === 'high') {
        setThinkingLevel(storedLevel);
      }
    } catch {
      // Ignore storage errors in restricted browsing contexts.
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(THINKING_LEVEL_STORAGE_KEY, thinkingLevel);
    } catch {
      // Ignore storage errors in restricted browsing contexts.
    }
  }, [thinkingLevel]);

  return {thinkingLevel, setThinkingLevel};
}
