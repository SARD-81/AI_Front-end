'use client';

import { env } from '@/lib/di/env';
import { useEffect } from 'react';

export function MswProvider() {
  useEffect(() => {
    if (!env.demoMode || process.env.NODE_ENV !== 'development') {
      return;
    }

    void import('@/data/mock/browser').then(({ worker }) =>
      worker.start({
        onUnhandledRequest: 'bypass',
      }),
    );
  }, []);

  return null;
}
