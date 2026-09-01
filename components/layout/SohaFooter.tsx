'use client';

import { useLocale } from 'next-intl';

export function SohaFooter() {
  const locale = useLocale();
  const text =
    locale === 'fa'
      ? 'تمامی حقوق مادی و معنوی متعلق به آزمایشگاه پردازش زبان طبیعی دانشگاه شهید بهشتی است.'
      : 'All material and intellectual rights belong to the Natural Language Processing Laboratory of Shahid Beheshti University.';

  return (
    <footer className="shrink-0 border-t border-[hsl(var(--surface-subtle))]/70 bg-[hsl(var(--surface-card))]/90 px-3 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] text-center text-[10px] leading-4 text-muted-foreground backdrop-blur sm:px-4 sm:py-2 sm:pb-2 sm:text-xs sm:leading-5 [@media(max-height:700px)]:py-1">
      {text}
    </footer>
  );
}
