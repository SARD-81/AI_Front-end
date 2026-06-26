'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso, type ListRange, type VirtuosoHandle } from 'react-virtuoso';
import { ArrowDown, Bot, Sparkles } from 'lucide-react';
import type { ChatMessage } from '@/lib/api/chat';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { MessageBubble } from './MessageBubble';
import { UserMessageRail } from './UserMessageRail';

type MessageListProps = {
  messages: ChatMessage[];
  typing: boolean;
  onCopyMessage: (content: string) => void;
  onEditMessage: (message: ChatMessage) => void;
  onRegenerate: () => void;
  onRetryMessage: (message: ChatMessage) => void;
  onRestoreMessage: (message: ChatMessage) => void;
};

type MessageListItem =
  | ChatMessage
  | {
      id: 'assistant-pending';
      role: 'assistant-pending';
    };

type UserAnchor = {
  anchorId: string;
  messageIndex: number;
  messageId: string;
  snippet: string;
};

function AssistantPendingBubble() {
  const t = useTranslations('app');
  const statuses = useMemo(
    () => [
      t('message.pendingStatus.connecting'),
      t('message.pendingStatus.thinking'),
      t('message.pendingStatus.generating')
    ],
    [t]
  );
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (reduceMotion) return undefined;

    const interval = window.setInterval(() => {
      setStatusIndex((current) => (current + 1) % statuses.length);
    }, 1500);

    return () => window.clearInterval(interval);
  }, [statuses.length]);

  return (
    <article
      className="mr-auto w-full max-w-[min(40rem,92%)]"
      aria-live="polite"
      aria-label={statuses[statusIndex]}
    >
      <div className="flex items-center gap-3 rounded-3xl border border-[hsl(var(--surface-subtle))]/80 bg-[hsl(var(--surface-card))]/80 px-4 py-3 shadow-card backdrop-blur-sm dark:bg-[hsl(var(--surface-elevated))]/60">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
          <Bot className="h-5 w-5" aria-hidden />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background text-primary shadow-sm ring-1 ring-primary/20">
            <Sparkles className="h-2.5 w-2.5 motion-safe:animate-pulse motion-reduce:animate-none" aria-hidden />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="transition-opacity duration-300 motion-reduce:transition-none">
              {statuses[statusIndex]}
            </span>
            <span className="flex items-center gap-1" aria-hidden>
              <span className="h-1.5 w-1.5 rounded-full bg-primary/80 motion-safe:animate-bounce motion-reduce:animate-none" />
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary/70 motion-safe:animate-bounce motion-reduce:animate-none"
                style={{ animationDelay: '120ms' }}
              />
              <span
                className="h-1.5 w-1.5 rounded-full bg-primary/60 motion-safe:animate-bounce motion-reduce:animate-none"
                style={{ animationDelay: '240ms' }}
              />
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/70" aria-hidden>
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-primary/35 to-transparent motion-safe:animate-pulse motion-reduce:animate-none" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function MessageList({
  messages,
  typing,
  onCopyMessage,
  onEditMessage,
  onRegenerate,
  onRetryMessage,
  onRestoreMessage
}: MessageListProps) {
  const t = useTranslations('app');
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const isAnchorNavRef = useRef(false);
  const anchorNavTimeoutRef = useRef<number | null>(null);
  const initializedHashScrollRef = useRef(false);
  const [atBottom, setAtBottom] = useState(true);
  const [activeAnchorId, setActiveAnchorId] = useState<string | undefined>(
    undefined
  );
  const [hoveredAnchorId, setHoveredAnchorId] = useState<string | null>(null);

  const items = useMemo<MessageListItem[]>(() => {
    if (!typing) return messages;
    return [
      ...messages,
      {
        id: 'assistant-pending',
        role: 'assistant-pending'
      }
    ];
  }, [messages, typing]);

  const userAnchors = useMemo<UserAnchor[]>(() => {
    return messages
      .map((message, messageIndex) => ({ message, messageIndex }))
      .filter(({ message }) => message.role === 'user')
      .map(({ message, messageIndex }) => ({
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

  const anchorsById = useMemo(
    () => new Map(userAnchors.map((anchor) => [anchor.anchorId, anchor])),
    [userAnchors]
  );

  useEffect(
    () => () => {
      if (anchorNavTimeoutRef.current)
        window.clearTimeout(anchorNavTimeoutRef.current);
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scrollFromHash = (behavior: 'auto' | 'smooth') => {
      if (isAnchorNavRef.current) return;
      const hash = window.location.hash.slice(1);
      if (!hash || !anchorsById.has(hash)) return;
      const anchor = anchorsById.get(hash);
      if (!anchor) return;

      isAnchorNavRef.current = true;
      virtuosoRef.current?.scrollToIndex({
        index: anchor.messageIndex,
        align: 'start',
        behavior
      });
      if (anchorNavTimeoutRef.current)
        window.clearTimeout(anchorNavTimeoutRef.current);
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
      const hash =
        typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
      const target = hash ? anchorsById.get(hash) : undefined;
      if (
        target &&
        target.messageIndex >= range.startIndex &&
        target.messageIndex <= range.endIndex
      ) {
        isAnchorNavRef.current = false;
      }
    }

    const { startIndex } = range;
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
          virtuosoRef.current?.scrollToIndex({
            index: anchor.messageIndex,
            align: 'start',
            behavior: 'smooth'
          });
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', `#${anchor.anchorId}`);
            if (anchorNavTimeoutRef.current)
              window.clearTimeout(anchorNavTimeoutRef.current);
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
          if (message.role === 'assistant-pending') {
            return (
              <div className="group mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
                <AssistantPendingBubble />
              </div>
            );
          }

          const anchorId =
            message.role === 'user' ? `msg-${message.id}` : undefined;
          return (
            <div className="group mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
              <MessageBubble
                message={message}
                onCopyMessage={onCopyMessage}
                onEditMessage={onEditMessage}
                onRegenerate={onRegenerate}
                onRetryMessage={onRetryMessage}
                onRestoreMessage={onRestoreMessage}
                isLastAssistant={
                  message.role === 'assistant' &&
                  message.id === lastAssistantMessageId
                }
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
          className="absolute bottom-5 right-5 z-10 mt-10 h-10 w-10 rounded-full shadow-lg"
          onClick={scrollToBottom}
          aria-label={t('message.scrollToBottom')}
          title={t('message.scrollToBottom')}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
