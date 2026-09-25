'use client';

import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

export function SohaFooter({ className }: { className?: string }) {
  const locale = useLocale();
  const text =
    locale === 'fa'
      ? 'تمامی حقوق مادی و معنوی متعلق به آزمایشگاه پردازش زبان طبیعی دانشگاه شهید بهشتی است.'
      : 'All material and intellectual rights belong to the Natural Language Processing Laboratory of Shahid Beheshti University.';

  return (
    <p
      className={cn(
        'px-3 text-center text-[10px] leading-4 text-muted-foreground sm:text-[11px]',
        className
      )}
    >
      {text}
    </p>
  );
}
