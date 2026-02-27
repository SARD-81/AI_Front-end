'use client';

import {zodResolver} from '@hookform/resolvers/zod';
import {AnimatePresence, motion} from 'motion/react';
import {useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogTitle} from '@/components/ui/dialog';
import {Form, FormControl, FormField, FormItem, FormMessage} from '@/components/ui/form';
import {Label} from '@/components/ui/label';
import {cn} from '@/lib/utils';

const FEEDBACK_CHIPS = [
  {key: 'off_topic', label: 'جواب ربطی نداشت', reasonCategory: 'irrelevant'},
  {key: 'incomplete', label: 'ناقص بود', reasonCategory: 'incomplete'},
  {key: 'wrong', label: 'اشتباه بود', reasonCategory: 'inaccurate'},
  {key: 'hallucination', label: 'اطلاعات ساختگی داشت', reasonCategory: 'inaccurate'},
  {key: 'unclear', label: 'واضح نبود', reasonCategory: 'tone'},
  {key: 'length_issue', label: 'خیلی کوتاه / خیلی طولانی بود', reasonCategory: 'other'},
  {key: 'source_issue', label: 'منبع مشکل داشت', reasonCategory: 'other'}
] as const;

type FeedbackChipKey = (typeof FEEDBACK_CHIPS)[number]['key'];
export type FeedbackReasonCategory = 'inaccurate' | 'irrelevant' | 'tone' | 'incomplete' | 'other';

const chipMap = Object.fromEntries(FEEDBACK_CHIPS.map((chip) => [chip.key, chip])) as Record<
  FeedbackChipKey,
  (typeof FEEDBACK_CHIPS)[number]
>;

const formSchema = z.object({
  selectedChipKey: z.enum(FEEDBACK_CHIPS.map((chip) => chip.key) as [FeedbackChipKey, ...FeedbackChipKey[]]),
  mappedReasonCategory: z.enum(['inaccurate', 'irrelevant', 'tone', 'incomplete', 'other']),
  text_comment: z.string().max(500, 'حداکثر ۵۰۰ کاراکتر مجاز است.').optional()
});

type FormValues = z.infer<typeof formSchema>;

type FeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: {isLiked: boolean | null};
  isSubmitting?: boolean;
  onSubmit: (payload: {is_liked: false; reason_category: FeedbackReasonCategory; text_comment?: string}) => Promise<void>;
  onClear: () => Promise<void>;
};

function buildComment(chipLabel: string, userComment?: string) {
  const prefix = `دلیل انتخاب‌شده: ${chipLabel}`;
  const trimmed = userComment?.trim();
  const full = trimmed ? `${prefix}\n\n${trimmed}` : prefix;
  return full.length <= 500 ? full : `${full.slice(0, 499)}…`;
}

export function FeedbackDialog({open, onOpenChange, initialValue, isSubmitting, onSubmit, onClear}: FeedbackDialogProps) {
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
      <DialogContent className="max-w-xl" dir="rtl">
        <DialogTitle className="text-right text-lg font-semibold">ارسال بازخورد</DialogTitle>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              const selectedChip = chipMap[values.selectedChipKey];
              const textComment = buildComment(selectedChip.label, values.text_comment);
              await onSubmit({
                is_liked: false,
                reason_category: values.mappedReasonCategory,
                text_comment: textComment
              });
              onOpenChange(false);
            })}
          >
            <FormField
              control={form.control}
              name="selectedChipKey"
              render={({field}) => (
                <FormItem>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
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
                              'rounded-full border px-3 py-1.5 text-sm transition-colors',
                              selected
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-background text-foreground hover:bg-muted'
                            )}
                          >
                            {chip.label}
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
                    جزئیات (اختیاری)
                  </Label>
                  <FormControl>
                    <textarea
                      id="feedback-comment"
                      className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      maxLength={500}
                      placeholder="در صورت نیاز توضیح بیشتری بنویسید"
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
                  <Button type="button" variant="ghost" className="px-0 text-destructive hover:text-destructive" onClick={onClear} disabled={isSubmitting}>
                    حذف بازخورد
                  </Button>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                انصراف
              </Button>
              <Button type="submit" disabled={submitDisabled}>
                ثبت بازخورد
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
