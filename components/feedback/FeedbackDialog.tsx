'use client';

import {zodResolver} from '@hookform/resolvers/zod';
import {AnimatePresence, motion} from 'motion/react';
import {useEffect, useMemo} from 'react';
import {useLocale, useTranslations} from 'next-intl';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogTitle} from '@/components/ui/dialog';
import {Form, FormControl, FormField, FormItem, FormMessage} from '@/components/ui/form';
import {Label} from '@/components/ui/label';
import type {FeedbackReasonCategory} from '@/lib/api/chat';
import {cn} from '@/lib/utils';

const FEEDBACK_CHIPS = [
  {key: 'off_topic', reasonCategory: 'irrelevant'},
  {key: 'incomplete', reasonCategory: 'incomplete'},
  {key: 'wrong', reasonCategory: 'inaccurate'},
  {key: 'hallucination', reasonCategory: 'inaccurate'},
  {key: 'unclear', reasonCategory: 'tone'},
  {key: 'length_issue', reasonCategory: 'other'},
  {key: 'source_issue', reasonCategory: 'other'}
] as const;

type FeedbackChipKey = (typeof FEEDBACK_CHIPS)[number]['key'];
const chipMap = Object.fromEntries(FEEDBACK_CHIPS.map((chip) => [chip.key, chip])) as Record<
  FeedbackChipKey,
  (typeof FEEDBACK_CHIPS)[number]
>;

const formSchema = z.object({
  selectedChipKey: z.enum(FEEDBACK_CHIPS.map((chip) => chip.key) as [FeedbackChipKey, ...FeedbackChipKey[]]),
  mappedReasonCategory: z.enum(['inaccurate', 'irrelevant', 'tone', 'incomplete', 'other']),
  text_comment: z.string().max(1000).optional()
});

type FormValues = z.infer<typeof formSchema>;

type FeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: {isLiked: boolean | null};
  isSubmitting?: boolean;
  onSubmit: (payload: {is_liked: false; reason_category: FeedbackReasonCategory; text_comment: string}) => Promise<void>;
  onClear: () => Promise<void>;
};

export function FeedbackDialog({open, onOpenChange, initialValue, isSubmitting, onSubmit, onClear}: FeedbackDialogProps) {
  const locale = useLocale();
  const t = useTranslations('app.feedback');
  const isRtl = locale === 'fa';
  const chipLabels = useMemo(
    () =>
      Object.fromEntries(FEEDBACK_CHIPS.map((chip) => [chip.key, t(`chips.${chip.key}`)])) as Record<FeedbackChipKey, string>,
    [t]
  );
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      selectedChipKey: undefined,
      mappedReasonCategory: undefined,
      text_comment: ''
    }
  });

  useEffect(() => {
    if (open) {
      form.reset({selectedChipKey: undefined, mappedReasonCategory: undefined, text_comment: ''});
    }
  }, [form, open]);

  const selectedChipKey = form.watch('selectedChipKey');
  const mappedReasonCategory = form.watch('mappedReasonCategory');
  const canClear = initialValue.isLiked !== null;

  useEffect(() => {
    if (!selectedChipKey) return;
    const nextCategory = chipMap[selectedChipKey].reasonCategory;
    if (mappedReasonCategory !== nextCategory) {
      form.setValue('mappedReasonCategory', nextCategory, {shouldValidate: true});
    }
  }, [form, mappedReasonCategory, selectedChipKey]);

  const submitDisabled = !selectedChipKey || !mappedReasonCategory || isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-2xl p-0 pe-0 sm:w-full',
          isRtl ? 'text-right' : 'text-left'
        )}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="shrink-0 border-b border-border/70 px-4 pb-3 pt-4 pe-11 sm:px-6 sm:pb-4 sm:pt-6 sm:pe-12">
          <DialogTitle className="text-base font-semibold sm:text-lg">{t('title')}</DialogTitle>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{t('description')}</p>
        </div>

        <Form {...form}>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit(async (values) => {
              await onSubmit({
                is_liked: false,
                reason_category: values.mappedReasonCategory,
                text_comment: values.text_comment?.trim() ?? ''
              });
              onOpenChange(false);
            })}
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
              <FormField
                control={form.control}
                name="selectedChipKey"
                render={({field}) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex min-w-0 flex-wrap gap-1.5 sm:gap-2">
                        {FEEDBACK_CHIPS.map((chip) => {
                          const selected = field.value === chip.key;
                          return (
                            <button
                              key={chip.key}
                              type="button"
                              onClick={() => {
                                field.onChange(chip.key);
                                form.setValue('mappedReasonCategory', chip.reasonCategory, {shouldValidate: true});
                              }}
                              className={cn(
                                'min-w-0 max-w-full rounded-full border px-2.5 py-1.5 text-xs font-medium leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))] focus-visible:ring-offset-2 sm:px-3 sm:text-sm',
                                selected
                                  ? 'border-[hsl(var(--info-border))] bg-[hsl(var(--info-surface))] text-[hsl(var(--info-text))] shadow-sm'
                                  : 'border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-card))] text-foreground hover:bg-[hsl(var(--surface-elevated))]'
                              )}
                            >
                              <span className="break-words">{chipLabels[chip.key]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="text_comment"
                render={({field}) => (
                  <FormItem>
                    <Label htmlFor="feedback-comment" className="text-sm font-medium">
                      {t('commentLabel')}
                    </Label>
                    <FormControl>
                      <textarea
                        id="feedback-comment"
                        className="flex min-h-20 max-h-[32dvh] w-full resize-none rounded-md border border-[hsl(var(--field-border))] bg-[hsl(var(--field))] px-3 py-2 text-sm leading-6 text-[hsl(var(--field-foreground))] outline-none ring-offset-background placeholder:text-[hsl(var(--field-placeholder))] focus-visible:border-[hsl(var(--field-focus))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--field-focus))] sm:min-h-24 sm:resize-y"
                        maxLength={1000}
                        placeholder={t('placeholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <AnimatePresence>
                {canClear ? (
                  <motion.div
                    initial={{opacity: 0, scale: 0.98}}
                    animate={{opacity: 1, scale: 1}}
                    exit={{opacity: 0, scale: 0.98}}
                    transition={{duration: 0.2, ease: 'easeOut'}}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto min-h-9 px-0 text-danger-text hover:bg-danger-surface hover:text-danger-text focus-visible:ring-danger"
                      onClick={onClear}
                      disabled={isSubmitting}
                    >
                      {t('clear')}
                    </Button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="shrink-0 border-t border-border/70 bg-[hsl(var(--surface-elevated))] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:flex sm:items-center sm:justify-end sm:gap-2 sm:px-6 sm:pb-4 sm:pt-4">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  {t('cancel')}
                </Button>
                <Button type="submit" disabled={submitDisabled}>
                  {t('submit')}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
