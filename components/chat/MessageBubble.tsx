'use client';

import {useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {Check, Copy} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import {copyToClipboard} from '@/lib/utils/clipboard';
import type {ChatMessage} from '@/lib/api/chat';
import {MessageActions} from './MessageActions';

function CodeBlock({value}: {value: string}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const copiedSuccessfully = await copyToClipboard(value);

    if (copiedSuccessfully) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-md border border-border bg-muted/60">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-xs text-muted-foreground">code</span>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <pre dir="ltr" className="overflow-x-auto p-3 text-sm leading-6">
        <code dir="ltr">{value}</code>
      </pre>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="inline-flex min-h-10 items-center gap-2 py-1 text-sm text-muted-foreground transition-opacity duration-200">
      <span>در حال پاسخ…</span>
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
};

export function MessageBubble({message, onCopyMessage, onEditMessage, onRegenerate}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isTyping = message.id === 'typing';

  return (
    <article className={cn('flex w-full', isUser ? 'justify-start' : 'justify-end')} aria-live="polite">
      <div className={cn('flex flex-col', isUser ? 'items-start' : 'items-end', 'max-w-[90%] md:max-w-[75%]')}>
        {isTyping ? (
          <ThinkingIndicator />
        ) : (
          <div
            className={cn(
              'prose-chat rounded-2xl px-4 py-3 text-[15px] leading-7 transition-all duration-200',
              isUser
                ? 'inline-flex w-fit max-w-full border border-border bg-card shadow-card'
                : 'w-full max-w-full border-none bg-transparent px-0 py-0 shadow-none'
            )}
          >
            {isUser ? (
              <p className="m-0 whitespace-pre-wrap break-words">{message.content}</p>
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
                      <code dir="ltr" className="rounded bg-muted px-1.5 py-0.5 text-sm" {...props}>
                        {text}
                      </code>
                    );
                  },
                  pre: ({children}) => <>{children}</>
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}

        {!isTyping ? (
          <MessageActions
            role={message.role}
            onCopy={() => onCopyMessage(message.content)}
            onEdit={isUser ? () => onEditMessage?.(message) : undefined}
            onRegenerate={message.role === 'assistant' ? onRegenerate : undefined}
          />
        ) : null}
      </div>
    </article>
  );
}
