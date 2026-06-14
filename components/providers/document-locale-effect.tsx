'use client';

import {useEffect} from 'react';

export function DocumentLocaleEffect({locale}: {locale: string}) {
  useEffect(() => {
    const direction = locale === 'fa' ? 'rtl' : 'ltr';

    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
  }, [locale]);

  return null;
}
