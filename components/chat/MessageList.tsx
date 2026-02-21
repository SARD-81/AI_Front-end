'use client';

import {useMemo, useRef, useState} from 'react';
import {Virtuoso, type VirtuosoHandle} from 'react-virtuoso';
import {ArrowDown} from 'lucide-react';
import type {ChatMessage} from '@/lib/api/chat';
import {Button} from '@/components/ui/button';
import {MessageBubble} from './MessageBubble';

type MessageListProps = {
  messages: ChatMessage[];
  typing: boolean;
  onCopyMessage: (content: string) => void;
  onEditMessage: (message: ChatMessage) => void;
  onRegenerate: () => void;
};

export function MessageList({messages, typing, onCopyMessage, onEditMessage, onRegenerate}: MessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [atBottom, setAtBottom] = useState(true);

  const items = useMemo(() => {
    if (!typing) return messages;
    return [...messages, {id: 'typing', role: 'assistant' as const, content: '...', createdAt: new Date().toISOString()}];
  }, [messages, typing]);

  const scrollToBottom = () => {
    virtuosoRef.current?.scrollToIndex({
      index: items.length - 1,
      align: 'end',
      behavior: 'smooth'
    });
    setAtBottom(true);
  };

  return (
    <div className="relative h-full min-h-0 w-full">
      <Virtuoso
        ref={virtuosoRef}
        data={items}
        className="h-full w-full"
        followOutput={atBottom ? 'auto' : false}
        atBottomStateChange={(bottom) => setAtBottom(bottom)}
        atBottomThreshold={80}
        itemContent={(_, message) => (
          <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
            <MessageBubble
              message={message}
              onCopyMessage={onCopyMessage}
              onEditMessage={onEditMessage}
              onRegenerate={onRegenerate}
            />
          </div>
        )}
      />

      {!atBottom && items.length > 0 ? (
        <Button
          type="button"
          size="icon"
          className="absolute bottom-24 end-4 z-10 h-10 w-10 rounded-full shadow-lg"
          onClick={scrollToBottom}
          aria-label="رفتن به پایین"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
