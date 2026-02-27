'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {Virtuoso, type ListRange, type VirtuosoHandle} from 'react-virtuoso';
import {ArrowDown} from 'lucide-react';
import type {ChatMessage} from '@/lib/api/chat';
import {Button} from '@/components/ui/button';
import {MessageBubble} from './MessageBubble';
import {UserMessageRail} from './UserMessageRail';

type MessageListProps = {
  messages: ChatMessage[];
  typing: boolean;
  onCopyMessage: (content: string) => void;
  onEditMessage: (message: ChatMessage) => void;
  onRegenerate: () => void;
};

type UserAnchor = {
  anchorId: string;
  messageIndex: number;
  messageId: string;
  snippet: string;
};

export function MessageList({messages, typing, onCopyMessage, onEditMessage, onRegenerate}: MessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const isAnchorNavRef = useRef(false);
  const anchorNavTimeoutRef = useRef<number | null>(null);
  const initializedHashScrollRef = useRef(false);
  const [atBottom, setAtBottom] = useState(true);
  const [activeAnchorId, setActiveAnchorId] = useState<string | undefined>(undefined);
  const [hoveredAnchorId, setHoveredAnchorId] = useState<string | null>(null);

  const items = useMemo(() => {
    if (!typing) return messages;
    return [...messages, {id: 'typing', role: 'assistant' as const, content: '...', createdAt: new Date().toISOString()}];
  }, [messages, typing]);

  const userAnchors = useMemo<UserAnchor[]>(() => {
    return messages
      .map((message, messageIndex) => ({message, messageIndex}))
      .filter(({message}) => message.role === 'user')
      .map(({message, messageIndex}) => ({
        anchorId: `msg-${message.id}`,
        messageIndex,
        messageId: message.id,
        snippet: message.content.replace(/\s+/g, ' ').trim().slice(0, 80)
      }));
  }, [messages]);

  const lastAssistantMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === 'assistant') return messages[i]?.id;
    }
    return undefined;
  }, [messages]);

  const anchorsById = useMemo(() => new Map(userAnchors.map((anchor) => [anchor.anchorId, anchor])), [userAnchors]);



  useEffect(
    () => () => {
      if (anchorNavTimeoutRef.current) window.clearTimeout(anchorNavTimeoutRef.current);
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scrollFromHash = (behavior: "auto" | "smooth") => {
      if (isAnchorNavRef.current) return;
      const hash = window.location.hash.slice(1);
      if (!hash || !anchorsById.has(hash)) return;
      const anchor = anchorsById.get(hash);
      if (!anchor) return;

      isAnchorNavRef.current = true;
      virtuosoRef.current?.scrollToIndex({index: anchor.messageIndex, align: 'start', behavior});
      if (anchorNavTimeoutRef.current) window.clearTimeout(anchorNavTimeoutRef.current);
      anchorNavTimeoutRef.current = window.setTimeout(() => {
        isAnchorNavRef.current = false;
      }, 750);
    };

    if (!initializedHashScrollRef.current) {
      initializedHashScrollRef.current = true;
      scrollFromHash('auto');
    }

    const onHashTarget = () => scrollFromHash('smooth');
    window.addEventListener('hashchange', onHashTarget);
    return () => window.removeEventListener('hashchange', onHashTarget);
  }, [anchorsById]);

  useEffect(() => {
    if (!activeAnchorId && userAnchors.length) {
      setActiveAnchorId(userAnchors[0]?.anchorId);
    }
  }, [activeAnchorId, userAnchors]);

  const scrollToBottom = () => {
    virtuosoRef.current?.scrollToIndex({
      index: items.length - 1,
      align: 'end',
      behavior: 'smooth'
    });
    setAtBottom(true);
  };

  const syncActiveFromRange = (range: ListRange) => {
    if (isAnchorNavRef.current) {
      const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
      const target = hash ? anchorsById.get(hash) : undefined;
      if (target && target.messageIndex >= range.startIndex && target.messageIndex <= range.endIndex) {
        isAnchorNavRef.current = false;
      }
    }

    const {startIndex} = range;
    let resolved = userAnchors[0];
    for (const anchor of userAnchors) {
      if (anchor.messageIndex <= startIndex) {
        resolved = anchor;
      } else {
        break;
      }
    }
    setActiveAnchorId(resolved?.anchorId);
  };

  return (
    <div className="relative h-full min-h-0 w-full">
      <UserMessageRail
        anchors={userAnchors}
        activeAnchorId={activeAnchorId}
        hoveredAnchorId={hoveredAnchorId}
        onAnchorHover={setHoveredAnchorId}
        onAnchorClick={(anchor) => {
          isAnchorNavRef.current = true;
          virtuosoRef.current?.scrollToIndex({index: anchor.messageIndex, align: 'start', behavior: 'smooth'});
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', `#${anchor.anchorId}`);
            if (anchorNavTimeoutRef.current) window.clearTimeout(anchorNavTimeoutRef.current);
            anchorNavTimeoutRef.current = window.setTimeout(() => {
              isAnchorNavRef.current = false;
            }, 750);
          }
        }}
      />

      <Virtuoso
        ref={virtuosoRef}
        data={items}
        className="h-full w-full"
        followOutput={atBottom ? 'auto' : false}
        atBottomStateChange={(bottom) => setAtBottom(bottom)}
        atBottomThreshold={80}
        rangeChanged={syncActiveFromRange}
        itemContent={(index, message) => {
          const anchorId = message.role === 'user' ? `msg-${message.id}` : undefined;
          return (
            <div className="group mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
              <MessageBubble
                message={message}
                onCopyMessage={onCopyMessage}
                onEditMessage={onEditMessage}
                onRegenerate={onRegenerate}
                isLastAssistant={message.role === 'assistant' && message.id === lastAssistantMessageId}
                anchorId={anchorId}
              />
            </div>
          );
        }}
      />

      {!atBottom && items.length > 0 ? (
        <Button
          type="button"
          size="icon"
          className="absolute bottom-5 mt-10 right-5 z-10 h-10 w-10 rounded-full shadow-lg"
          onClick={scrollToBottom}
          aria-label="رفتن به پایین"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
