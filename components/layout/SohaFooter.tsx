'use client';

import { useLocale } from 'next-intl';

export function SohaFooter() {
  const locale = useLocale();
  const text =
    locale === 'fa'
      ? 'تمامی حقوق مادی و معنوی متعلق به آزمایشگاه پردازش زبان طبیعی دانشگاه شهید بهشتی است.'
      : 'All material and intellectual rights belong to the Natural Language Processing Laboratory of Shahid Beheshti University.';

  return (
    <footer className="shrink-0 border-t border-[hsl(var(--surface-subtle))]/70 bg-[hsl(var(--surface-card))]/90 px-4 py-2 text-center text-[11px] leading-5 text-muted-foreground backdrop-blur sm:text-xs">
      {text}
    </footer>
  );
}
