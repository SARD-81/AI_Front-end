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
    <div className="my-3 overflow-hidden rounded-md border border-border bg-surface-1">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-xs text-muted-foreground">code</span>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <pre dir="ltr" className="overflow-x-auto bg-surface-1 p-3 text-sm leading-6 text-foreground">
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
                  <p className="m-0 whitespace-pre-wrap break-words rounded-2xl border border-border bg-surface-2 px-4 py-3 text-foreground shadow-card">
                    {message.content}
                  </p>
                  <div className="absolute right-0 top-full h-2 w-full" aria-hidden />
                  <MessageActions
                    role={message.role}
                    onCopy={() => onCopyMessage(message.content)}
                    onEdit={() => onEditMessage?.(message)}
                    className="absolute right-0 top-full z-10 mt-2 opacity-0 translate-y-1 pointer-events-none transition-all duration-150 ease-out group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto"
                  />
                </div>
              ) : (
                <div className="prose-chat">
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
                          <code dir="ltr" className="rounded border border-border/80 bg-surface-1 px-1.5 py-0.5 text-sm" {...props}>
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
                </div>
              )}
            </div>

            {!isUser ? (
              <MessageActions
                role={message.role}
                onCopy={() => onCopyMessage(message.content)}
                onRegenerate={onRegenerate}
                className="mr-auto justify-start"
              />
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}
