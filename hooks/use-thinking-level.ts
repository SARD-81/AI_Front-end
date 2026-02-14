'use client';

import {useEffect, useState} from 'react';
import type {ThinkingLevel} from '@/lib/api/chat';

const THINKING_LEVEL_STORAGE_KEY = 'thinking_level';

export function useThinkingLevel(defaultValue: ThinkingLevel = 'standard') {
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>(defaultValue);

  useEffect(() => {
    const storedLevel = window.localStorage.getItem(THINKING_LEVEL_STORAGE_KEY);
    if (storedLevel === 'standard' || storedLevel === 'low' || storedLevel === 'medium' || storedLevel === 'high') {
      setThinkingLevel(storedLevel);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THINKING_LEVEL_STORAGE_KEY, thinkingLevel);
  }, [thinkingLevel]);

  return {thinkingLevel, setThinkingLevel};
}
