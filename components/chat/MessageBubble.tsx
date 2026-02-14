'use client';

import {useState} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {Check, Copy} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import type {ChatMessage} from '@/lib/api/chat';

function CodeBlock({value}: {value: string}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
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

export function MessageBubble({message}: {message: ChatMessage}) {
  const isUser = message.role === 'user';

  return (
    <article className={cn('flex w-full', isUser ? 'justify-start' : 'justify-end')} aria-live="polite">
      <div
        className={cn(
          'prose-chat w-full max-w-[92%] rounded-2xl border px-4 py-3 text-[15px] leading-7 shadow-card md:max-w-[80%]',
          isUser ? 'border-border bg-card' : 'border-primary/20 bg-primary/10 dark:bg-primary/15'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap m-0">{message.content}</p>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({children}) => <p className="my-2">{children}</p>,
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
    </article>
  );
}
