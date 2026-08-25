'use client';

import { memo, useMemo, useState } from 'react';
import ReactMarkdown, {type Components} from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { AlertCircle, Check, Clock, Copy } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog';
import { Button } from '@/components/ui/button';
import { putMessageFeedback } from '@/lib/services/chat-service';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '@/lib/utils/clipboard';
import type { ChatDetail, ChatMessage, MessageFeedbackPayload } from '@/lib/api/chat';
import { CodeHighlight } from './CodeHighlight';
import { ExpandableTable } from './ExpandableTable';
import { MessageActions } from './MessageActions';
import { SourcesDialog } from './SourcesDialog';

function CodeBlock({ value, language }: { value: string; language?: string }) {
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
    <div className="my-3 overflow-hidden rounded-md border border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-elevated))]">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground" dir="ltr">
          {language ?? t('message.codeLabel')}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          aria-label={t('messageActions.copy')}
          title={t('messageActions.copy')}
          className="h-7 px-2"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      <pre
        dir="ltr"
        className="overflow-x-auto bg-[hsl(var(--surface-elevated))] p-3 text-sm leading-6 text-foreground"
      >
        <code dir="ltr" className="code-highlight">
          <CodeHighlight code={value} language={language} />
        </code>
      </pre>
    </div>
  );
}

function ThinkingIndicator() {
  const t = useTranslations('app');
  return (
    <div className="inline-flex min-h-10 items-center gap-2.5 py-1 text-sm">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.12)] motion-safe:animate-pulse"
        aria-hidden
      />
      <span className="loader-shimmer font-medium">{t('message.thinking')}</span>
    </div>
  );
}

// A full component map: without it react-markdown renders bare tags that the
// Tailwind preflight strips of every margin, list marker and heading size,
// which is why answers looked like unformatted plain text.
const markdownComponents: Components = {
  p: ({ children }) => <p className="my-3 text-justify leading-8">{children}</p>,
  h1: ({ children }) => <h1 className="mb-3 mt-5 text-xl font-bold leading-8">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2.5 mt-5 text-lg font-bold leading-8">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-4 text-base font-bold leading-7">{children}</h3>,
  h4: ({ children }) => <h4 className="mb-2 mt-4 text-sm font-bold leading-7">{children}</h4>,
  ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 ps-6">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 ps-6">{children}</ol>,
  li: ({ children }) => <li className="leading-8 marker:text-muted-foreground">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="opacity-70">{children}</del>,
  hr: () => <hr className="my-5 border-t border-[hsl(var(--surface-subtle))]" />,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 rounded-e-lg border-s-4 border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-elevated))]/60 px-4 py-2">
      {children}
    </blockquote>
  ),
  code: ({ className, children, ...props }) => {
    const text = String(children).replace(/\n$/, '');
    const languageMatch = /language-([\w+-]+)/.exec(className ?? '');
    if (languageMatch) {
      return <CodeBlock value={text} language={languageMatch[1]} />;
    }
    return (
      <code
        dir="ltr"
        className="rounded border border-[hsl(var(--surface-subtle))] bg-[hsl(var(--surface-elevated))] px-1.5 py-0.5 text-sm"
        {...props}
      >
        {text}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
  table: ({ children }) => <ExpandableTable>{children}</ExpandableTable>,
  thead: ({ children }) => <thead>{children}</thead>,
  th: ({ children }) => <th>{children}</th>,
  td: ({ children }) => <td>{children}</td>
};

type MessageBubbleProps = {
  message: ChatMessage;
  onCopyMessage: (content: string) => void;
  onEditMessage?: (message: ChatMessage) => void;
  onRegenerate?: (message: ChatMessage) => void;
  onRetryMessage?: (message: ChatMessage) => void;
  onRestoreMessage?: (message: ChatMessage) => void;
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
  onRetryMessage,
  onRestoreMessage,
  isLastAssistant,
  anchorId
}: MessageBubbleProps) {
  const t = useTranslations('app');
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const isUser = message.role === 'user';
  const aiResources = message.aiResources ?? [];
  const hasSources = !isUser && aiResources.length > 0;
  const isTyping = message.id === 'typing';
  const isStreaming = message.id === 'streaming';
  const sendStatus = message.sendStatus ?? (isUser ? 'sent' : undefined);
  const isAssistantEnglish = useMemo(
    () => message.role === 'assistant' && isMostlyEnglish(message.content),
    [message.role, message.content]
  );
  const format = useFormatter();
  const timeLabel = useMemo(() => {
    if (!message.createdAt || isTyping || isStreaming) return '';
    const date = new Date(message.createdAt);
    if (Number.isNaN(date.getTime())) return '';
    return format.dateTime(date, { hour: '2-digit', minute: '2-digit' });
  }, [format, message.createdAt, isTyping, isStreaming]);

  const feedbackMutation = useMutation({
    mutationFn: ({
      messageId,
      payload
    }: {
      messageId: string;
      payload: MessageFeedbackPayload;
    }) => putMessageFeedback(messageId, payload),
    onSuccess: (_data, variables) => {
      queryClient.setQueriesData<ChatDetail>(
        { queryKey: ['chat'] },
        (previous) => {
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
        }
      );
    }
  });

  const feedbackState = message.is_liked ?? null;

  const handleLike = async () => {
    if (!message.id || isTyping || isStreaming || feedbackMutation.isPending)
      return;
    try {
      await feedbackMutation.mutateAsync({
        messageId: message.id,
        payload:
          feedbackState === true
            ? { is_liked: null, reason_category: null, text_comment: '' }
            : { is_liked: true, reason_category: null, text_comment: '' }
      });
      toast.success(t('feedback.toastSaved'));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('feedback.toastSaveError')
      );
    }
  };

  const feedbackDisabled =
    !message.id || isTyping || isStreaming || feedbackMutation.isPending;

  return (
    <article
      className="group/message w-full motion-safe:animate-message-in"
      aria-live={isTyping ? 'polite' : 'off'}
    >
      <div className="flex w-full flex-col">
        {isTyping ? (
          <div className="w-full">
            <ThinkingIndicator />
          </div>
        ) : (
          <>
            <div
              className={cn(
                // Both roles share one column (ChatGPT-like); only the bubble
                // inside it is aligned to the user's side.
                'relative w-full text-[15px] leading-7 transition-all duration-200',
                isUser
                  ? 'msg-user-row'
                  : 'rounded-none border-0 bg-transparent px-0 py-0 text-foreground shadow-none'
              )}
            >
              {isUser ? (
                <div className="group relative ml-auto w-fit max-w-[min(38rem,88%)]">
                  {anchorId ? (
                    <span
                      id={anchorId}
                      data-anchor-id={anchorId}
                      className="pointer-events-none absolute -top-2 h-0 w-0"
                      aria-hidden
                    />
                  ) : null}
                  <p
                    className={cn(
                      'm-0 whitespace-pre-wrap break-words rounded-3xl border border-[hsl(var(--bubble-user-border))] bg-[hsl(var(--bubble-user))] px-4 py-3 text-foreground shadow-sm',
                      sendStatus === 'failed'
                        ? 'border-[hsl(var(--danger-border))] bg-[hsl(var(--danger-surface))] text-[hsl(var(--danger-text))]'
                        : undefined,
                      sendStatus === 'pending' ? 'border-[hsl(var(--warning-border))] bg-[hsl(var(--warning-surface))] text-[hsl(var(--warning-text))]' : undefined
                    )}
                  >
                    {message.content}
                  </p>
                  {sendStatus === 'pending' ? (
                    <div className="msg-user-meta mt-1 flex items-center gap-1 text-xs text-[hsl(var(--warning-text))]">
                      <Clock className="h-3 w-3" />
                      <span>{t('message.pending')}</span>
                    </div>
                  ) : null}
                  {sendStatus === 'failed' ? (
                    <div className="msg-user-meta mt-1 flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--danger-text))]">
                      <span className="inline-flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {t('message.failed')}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 px-2 text-xs"
                        onClick={() => onRetryMessage?.(message)}
                      >
                        {t('chat.retryFailed')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => onRestoreMessage?.(message)}
                      >
                        {t('chat.restoreToInput')}
                      </Button>
                    </div>
                  ) : null}
                  {sendStatus !== 'pending' ? (
                    <>
                      <div
                        className="absolute right-0 top-full h-2 w-full"
                        aria-hidden
                      />
                      <MessageActions
                        role={message.role}
                        onCopy={() => onCopyMessage(message.content)}
                        onEdit={() => onEditMessage?.(message)}
                        timeLabel={timeLabel}
                        dateTime={message.createdAt}
                        className="msg-user-actions pointer-events-none absolute top-full z-10 mt-1.5 translate-y-1 opacity-0 transition-all duration-300 ease-out group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 max-sm:pointer-events-auto max-sm:translate-y-0 max-sm:opacity-100"
                      />
                    </>
                  ) : null}
                </div>
              ) : (
                <div
                  dir={isAssistantEnglish ? 'ltr' : undefined}
                  className={cn(
                    'prose-chat',
                    isAssistantEnglish ? 'text-left ltr:text-left' : undefined
                  )}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkBreaks]}
                    skipHtml
                    components={markdownComponents}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {!isUser ? (
              <>
                <MessageActions
                  role={message.role}
                  onCopy={() => onCopyMessage(message.content)}
                  onRegenerate={() => onRegenerate?.(message)}
                  onLike={handleLike}
                  onDislike={() => setDialogOpen(true)}
                  onShowSources={
                    hasSources ? () => setSourcesOpen(true) : undefined
                  }
                  hasSources={hasSources}
                  feedbackState={feedbackState}
                  feedbackDisabled={feedbackDisabled}
                  timeLabel={timeLabel}
                  dateTime={message.createdAt}
                  className={cn(
                    'mr-auto justify-start transition-all duration-300',
                    isLastAssistant
                      ? 'pointer-events-auto opacity-100'
                      : 'pointer-events-none opacity-0 group-hover/message:pointer-events-auto group-hover/message:opacity-100 group-focus-within/message:pointer-events-auto group-focus-within/message:opacity-100 max-sm:pointer-events-auto max-sm:opacity-100'
                  )}
                />
                {hasSources ? (
                  <SourcesDialog
                    open={sourcesOpen}
                    onOpenChange={setSourcesOpen}
                    resources={aiResources}
                  />
                ) : null}

                <FeedbackDialog
                  open={dialogOpen}
                  onOpenChange={setDialogOpen}
                  initialValue={{ isLiked: feedbackState }}
                  isSubmitting={feedbackMutation.isPending}
                  onSubmit={async ({ reason_category, text_comment }) => {
                    if (!message.id) return;
                    try {
                      await feedbackMutation.mutateAsync({
                        messageId: message.id,
                        payload: {
                          is_liked: false,
                          reason_category,
                          text_comment
                        }
                      });
                      toast.success(t('feedback.toastSaved'));
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : t('feedback.toastSaveError')
                      );
                      throw error;
                    }
                  }}
                  onClear={async () => {
                    if (!message.id) return;
                    try {
                      await feedbackMutation.mutateAsync({
                        messageId: message.id,
                        payload: { is_liked: null, reason_category: null, text_comment: '' }
                      });
                      setDialogOpen(false);
                      toast.success(t('feedback.toastCleared'));
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : t('feedback.toastClearError')
                      );
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
    prevProps.message.aiResources === nextProps.message.aiResources &&
    prevProps.message.sendStatus === nextProps.message.sendStatus &&
    prevProps.isLastAssistant === nextProps.isLastAssistant &&
    prevProps.anchorId === nextProps.anchorId
);
