'use client';

import {memo, useMemo, useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {Check, Copy} from 'lucide-react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useTranslations} from 'next-intl';
import {toast} from 'sonner';
import {FeedbackDialog, type FeedbackReasonCategory} from '@/components/feedback/FeedbackDialog';
import {Button} from '@/components/ui/button';
import {putMessageFeedback} from '@/lib/services/chat-service';
import {cn} from '@/lib/utils';
import {copyToClipboard} from '@/lib/utils/clipboard';
import type {ChatDetail, ChatMessage} from '@/lib/api/chat';
import {MessageActions} from './MessageActions';

function CodeBlock({value}: {value: string}) {
  const t = useTranslations('app');
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const copiedSuccessfully = await copyToClipboard(value);

    if (copiedSuccessfully) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-md border border-border bg-muted">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-xs text-muted-foreground">{t('message.codeLabel')}</span>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <pre dir="ltr" className="overflow-x-auto bg-muted p-3 text-sm leading-6 text-foreground">
        <code dir="ltr">{value}</code>
      </pre>
    </div>
  );
}

function ThinkingIndicator() {
  const t = useTranslations('app');
  return (
    <div className="inline-flex min-h-10 items-center gap-2 py-1 text-sm text-muted-foreground transition-opacity duration-200">
      <span>{t('message.thinking')}</span>
      <span className="flex items-center gap-1" aria-hidden>
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground motion-safe:animate-bounce motion-reduce:animate-none" />
        <span
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground motion-safe:animate-bounce motion-reduce:animate-none"
          style={{animationDelay: '120ms'}}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground motion-safe:animate-bounce motion-reduce:animate-none"
          style={{animationDelay: '240ms'}}
        />
      </span>
    </div>
  );
}

type MessageBubbleProps = {
  message: ChatMessage;
  onCopyMessage: (content: string) => void;
  onEditMessage?: (message: ChatMessage) => void;
  onRegenerate?: () => void;
  isLastAssistant?: boolean;
  anchorId?: string;
};

function isMostlyEnglish(text: string): boolean {
  const latinLetters = (text.match(/[A-Za-z]/g) ?? []).length;
  const arabicLetters = (text.match(/[\u0600-\u06FF]/g) ?? []).length;

  return latinLetters >= 20 && latinLetters >= arabicLetters * 2;
}

function MessageBubbleComponent({
  message,
  onCopyMessage,
  onEditMessage,
  onRegenerate,
  isLastAssistant,
  anchorId
}: MessageBubbleProps) {
  const t = useTranslations('app');
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const isUser = message.role === 'user';
  const isTyping = message.id === 'typing';
  const isStreaming = message.id === 'streaming';
  const isAssistantEnglish = useMemo(
    () => message.role === 'assistant' && isMostlyEnglish(message.content),
    [message.role, message.content]
  );

  const feedbackMutation = useMutation({
    mutationFn: ({
      messageId,
      payload
    }: {
      messageId: string;
      payload:
        | {is_liked: true}
        | {is_liked: null}
        | {is_liked: false; reason_category: FeedbackReasonCategory; text_comment?: string};
    }) => putMessageFeedback(messageId, payload),
    onSuccess: (_data, variables) => {
      queryClient.setQueriesData<ChatDetail>({queryKey: ['chat']}, (previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          messages: previous.messages.map((item) =>
            item.id === variables.messageId
              ? {
                  ...item,
                  is_liked: variables.payload.is_liked
                }
              : item
          )
        };
      });
    }
  });

  const feedbackState = message.is_liked ?? null;

  const handleCopyLink = async () => {
    if (!anchorId || typeof window === 'undefined') return;
    const deepLink = `${window.location.origin}${window.location.pathname}#${anchorId}`;
    const copied = await copyToClipboard(deepLink);
    if (copied) {
      toast.success(t('message.copyLinkSuccess'));
      window.history.replaceState(null, '', `#${anchorId}`);
      return;
    }
    toast.error(t('message.copyLinkError'));
  };

  const handleLike = async () => {
    if (!message.id || isTyping || isStreaming || feedbackMutation.isPending) return;
    try {
      await feedbackMutation.mutateAsync({
        messageId: message.id,
        payload: feedbackState === true ? {is_liked: null} : {is_liked: true}
      });
      toast.success('بازخورد ثبت شد.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ارسال بازخورد ناموفق بود.');
    }
  };

  const feedbackDisabled = !message.id || isTyping || isStreaming || feedbackMutation.isPending;

  return (
    <article className="w-full" aria-live="polite">
      <div className="flex w-full flex-col">
        {isTyping ? (
          <div className="mr-auto w-full max-w-[min(40rem,92%)]">
            <ThinkingIndicator />
          </div>
        ) : (
          <>
            <div
              className={cn(
                'relative text-[15px] leading-7 transition-all duration-200',
                isUser
                  ? 'ml-auto w-fit max-w-[min(32rem,85%)]'
                  : 'mr-auto w-full max-w-[min(40rem,92%)] bg-transparent border-0 shadow-none rounded-none px-0 py-0 text-foreground'
              )}
            >
              {isUser ? (
                <div className="group relative w-fit max-w-full">
                  {anchorId ? <span id={anchorId} data-anchor-id={anchorId} className="pointer-events-none absolute -top-2 h-0 w-0" aria-hidden /> : null}
                  <p className="m-0 whitespace-pre-wrap break-words rounded-2xl border border-border bg-secondary px-4 py-3 text-foreground shadow-card">
                    {message.content}
                  </p>
                  <div className="absolute right-0 top-full h-2 w-full" aria-hidden />
                  <MessageActions
                    role={message.role}
                    onCopy={() => onCopyMessage(message.content)}
                    onCopyLink={handleCopyLink}
                    onEdit={() => onEditMessage?.(message)}
                    className="absolute right-0 top-full z-10 mt-2 opacity-0 translate-y-1 pointer-events-none transition-all duration-150 ease-out group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto"
                  />
                </div>
              ) : (
                <div dir={isAssistantEnglish ? 'ltr' : undefined} className={cn('prose-chat', isAssistantEnglish ? 'text-left ltr:text-left' : undefined)}>
                  {isStreaming ? (
                    <p className="my-2 whitespace-pre-wrap break-words leading-8">{message.content}</p>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({children}) => <p className="my-2 leading-8">{children}</p>,
                        code: ({className, children, ...props}) => {
                          const text = String(children).replace(/\n$/, '');
                          if (className?.includes('language-')) {
                            return <CodeBlock value={text} />;
                          }
                          return (
                            <code dir="ltr" className="rounded border border-border/80 bg-muted px-1.5 py-0.5 text-sm" {...props}>
                              {text}
                            </code>
                          );
                        },
                        pre: ({children}) => <>{children}</>,
                        table: ({children}) => (
                          <div className="my-3 overflow-x-auto">
                            <table>{children}</table>
                          </div>
                        )
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  )}
                </div>
              )}
            </div>

            {!isUser ? (
              <>
                <MessageActions
                  role={message.role}
                  onCopy={() => onCopyMessage(message.content)}
                  onRegenerate={onRegenerate}
                  onLike={handleLike}
                  onDislike={() => setDialogOpen(true)}
                  feedbackState={feedbackState}
                  feedbackDisabled={feedbackDisabled}
                  className={cn(
                    'mr-auto justify-start transition-all duration-150',
                    isLastAssistant ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'
                  )}
                />
                <FeedbackDialog
                  open={dialogOpen}
                  onOpenChange={setDialogOpen}
                  initialValue={{isLiked: feedbackState}}
                  isSubmitting={feedbackMutation.isPending}
                  onSubmit={async ({reason_category, text_comment}) => {
                    if (!message.id) return;
                    try {
                      await feedbackMutation.mutateAsync({
                        messageId: message.id,
                        payload: {
                          is_liked: false,
                          reason_category,
                          ...(text_comment ? {text_comment} : {})
                        }
                      });
                      toast.success('بازخورد ثبت شد.');
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'ارسال بازخورد ناموفق بود.');
                      throw error;
                    }
                  }}
                  onClear={async () => {
                    if (!message.id) return;
                    try {
                      await feedbackMutation.mutateAsync({
                        messageId: message.id,
                        payload: {is_liked: null}
                      });
                      setDialogOpen(false);
                      toast.success('بازخورد حذف شد.');
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'حذف بازخورد ناموفق بود.');
                    }
                  }}
                />
              </>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}

export const MessageBubble = memo(
  MessageBubbleComponent,
  (prevProps, nextProps) =>
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.role === nextProps.message.role &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.is_liked === nextProps.message.is_liked &&
    prevProps.isLastAssistant === nextProps.isLastAssistant &&
    prevProps.anchorId === nextProps.anchorId
);
