import Image from 'next/image';
import { cn } from '@/lib/utils';

/** Preserve the original mark and alpha; whiten only its pixels on dark surfaces. */
export function UniversityLogo({
  alt,
  className,
  inverse = false
}: {
  alt: string;
  className?: string;
  inverse?: boolean;
}) {
  return (
    <span className={cn('relative block shrink-0 overflow-hidden', className)}>
      <Image
        src="/Logo.png"
        alt={alt}
        fill
        sizes="320px"
        priority
        className={cn(
          'scale-[1.9] object-contain',
          inverse ? 'brightness-0 invert' : 'dark:brightness-0 dark:invert'
        )}
      />
    </span>
  );
}
