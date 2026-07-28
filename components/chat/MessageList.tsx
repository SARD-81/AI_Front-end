'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso, type ListRange, type VirtuosoHandle } from 'react-virtuoso';
import { ArrowDown } from 'lucide-react';
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
  onRegenerate: (message: ChatMessage) => void;
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

// Kept module-level so the object identity never changes between renders;
// Virtuoso remounts its internal components whenever this prop is a new object.
const VIRTUOSO_COMPONENTS = {
  // Clears the floating glass header so the very first message starts below it.
  Header: () => <div className="h-20 w-full shrink-0" aria-hidden />,
  Footer: () => <div className="h-4 w-full shrink-0" aria-hidden />
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
      className="w-full"
      aria-live="polite"
      aria-label={statuses[statusIndex]}
    >
      {/* A calm, glassy "typing" card: an orbiting spark, shimmering status text
          and three soft dots. No progress bar, because the real duration of the
          answer is unknown and a fake bar reads as broken. */}
      <div className="inline-flex max-w-full items-center gap-3 rounded-2xl border border-[hsl(var(--surface-subtle))]/70 bg-[hsl(var(--surface-card))]/70 px-3.5 py-2.5 shadow-sm backdrop-blur-md dark:bg-[hsl(var(--surface-elevated))]/50">
        <span className="loader-orb loader-orb-lg" aria-hidden />
        <span className="loader-shimmer min-w-0 truncate text-sm font-medium">
          {statuses[statusIndex]}
        </span>
        <span className="loader-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
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

    // Highlight the user message that is actually visible at the top of the
    // viewport. The previous logic always resolved to the anchor *before* the
    // first visible row, which made the rail lag one tick behind.
    const { startIndex, endIndex } = range;
    const visible = userAnchors.find(
      (anchor) =>
        anchor.messageIndex >= startIndex && anchor.messageIndex <= endIndex
    );
    let resolved = visible;
    if (!resolved) {
      for (const anchor of userAnchors) {
        if (anchor.messageIndex <= startIndex) {
          resolved = anchor;
        } else {
          break;
        }
      }
    }
    setActiveAnchorId((resolved ?? userAnchors[0])?.anchorId);
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
        // A scrollable spacer that belongs to the list content itself. Padding on
        // the item wrapper cannot be used here: every Virtuoso row lives in its
        // own container, so `first:` would match each row instead of only the
        // topmost message.
        components={VIRTUOSO_COMPONENTS}
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
          className="absolute bottom-5 left-1/2 z-10 h-10 w-10 -translate-x-1/2 rounded-full shadow-lg"
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
