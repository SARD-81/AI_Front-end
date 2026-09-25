'use client';

import {AnimatePresence, motion, useReducedMotion} from 'motion/react';
import {Check} from 'lucide-react';
import {cn} from '@/lib/utils';

export type ChecklistRule = {
  id: string;
  label: string;
  met: boolean;
};

type ValidationChecklistProps = {
  /** Short heading, e.g. "شرایط رمز عبور". */
  title: string;
  rules: ChecklistRule[];
  className?: string;
  tone?: 'night' | 'paper';
};

/**
 * Animated, live "what is still missing" checklist.
 *
 * Why: users previously only learned about a broken rule *after* submitting,
 * and only the first failing rule was reported. Showing every rule with its
 * current state removes the guesswork and the trial-and-error loop.
 *
 * Motion is intentionally small (spring pop on the tick, soft colour fade) and
 * fully disabled when the OS asks for reduced motion.
 */
export function ValidationChecklist({
  title,
  rules,
  className,
  tone = 'night'
}: ValidationChecklistProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        tone === 'paper'
          ? 'rounded-2xl border border-[#d7e6eb] bg-[#f3f8f8] p-3.5'
          : 'rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 shadow-inner shadow-black/10',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <p className={tone === 'paper' ? 'text-xs font-bold text-[#245066]' : 'text-xs font-bold text-slate-200/90'}>{title}</p>
      </div>

      <ul className="mt-2.5 space-y-1.5" aria-live="polite">
        {rules.map((rule) => (
          <motion.li
            key={rule.id}
            layout={!reduceMotion}
            initial={reduceMotion ? false : {opacity: 0, y: 4}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.18, ease: 'easeOut'}}
            className="flex items-center gap-2"
          >
            <span
              className={cn(
                'relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
                rule.met
                  ? tone === 'paper'
                    ? 'border-[#1f6b4a] bg-[#e5f4ee] text-[#1f6b4a]'
                    : 'border-emerald-400/70 bg-emerald-400/20 text-emerald-200'
                  : tone === 'paper'
                    ? 'border-dashed border-[#9ec3ce] bg-white text-transparent'
                    : 'border-dashed border-white/25 bg-white/[0.03] text-transparent'
              )}
              aria-hidden="true"
            >
              <AnimatePresence initial={false}>
                {rule.met ? (
                  <motion.span
                    key="tick"
                    initial={reduceMotion ? false : {scale: 0.4, opacity: 0}}
                    animate={{scale: 1, opacity: 1}}
                    exit={reduceMotion ? {opacity: 0} : {scale: 0.4, opacity: 0}}
                    transition={
                      reduceMotion
                        ? {duration: 0}
                        : {type: 'spring', stiffness: 520, damping: 24}
                    }
                    className="flex items-center justify-center"
                  >
                    <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="dot"
                    initial={false}
                    className="h-1 w-1 rounded-full bg-white/35"
                  />
                )}
              </AnimatePresence>
            </span>
            <span
              className={cn(
                'text-xs leading-5 transition-colors duration-200',
                rule.met
                  ? tone === 'paper' ? 'text-[#1f6b4a]' : 'text-emerald-100/90'
                  : tone === 'paper' ? 'text-[#245066]' : 'text-slate-300/80'
              )}
            >
              {rule.label}
            </span>
            <span className="sr-only">{rule.met ? '✓' : '—'}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
