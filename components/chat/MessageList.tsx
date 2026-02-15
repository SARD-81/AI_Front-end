'use client';

import {useMemo, useRef, useState} from 'react';
import {Virtuoso, type VirtuosoHandle} from 'react-virtuoso';
import type {ChatMessage} from '@/lib/api/chat';
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

  return (
    <div className="h-full min-h-0">
      <Virtuoso
        ref={virtuosoRef}
        data={items}
        className="h-full"
        followOutput={atBottom ? 'smooth' : false}
        atBottomStateChange={(bottom) => setAtBottom(bottom)}
        itemContent={(_, message) => (
          <div className="px-3 py-2 md:px-6">
            <MessageBubble
              message={message}
              onCopyMessage={onCopyMessage}
              onEditMessage={onEditMessage}
              onRegenerate={onRegenerate}
            />
          </div>
        )}
      />
    </div>
  );
}
