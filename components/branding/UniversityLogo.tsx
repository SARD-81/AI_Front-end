import Image from 'next/image';
import { cn } from '@/lib/utils';

/** The original PNG has transparent margins occupying half of each dimension. */
export function UniversityLogo({
  alt,
  className
}: {
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'shrink-0 rounded-2xl border border-border bg-white p-2 shadow-soft',
        className
      )}
    >
      <div className="relative h-full w-full overflow-hidden">
        <Image
          src="/Logo.png"
          alt={alt}
          fill
          sizes="384px"
          priority
          className="scale-[1.9] object-contain"
        />
      </div>
    </div>
  );
}
