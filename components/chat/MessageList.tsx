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

const VIRTUOSO_COMPONENTS = {
  Header: () => <div className="h-20 w-full shrink-0" aria-hidden />,
  Footer: () => <div className="h-16 w-full shrink-0 sm:h-4" aria-hidden />
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
  const [statusIndex] = useState(() => Math.floor(Math.random() * 3));
  const status = statuses[statusIndex] ?? statuses[0];

  return (
    <article className="w-full" aria-live="polite" aria-label={status}>
      <div className="inline-flex max-w-full items-center gap-2.5 py-1.5 text-sm">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.12)] motion-safe:animate-pulse"
          aria-hidden
        />
        <span className="loader-shimmer min-w-0 truncate font-medium">
          {status}
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
  const forceBottomFrameRef = useRef<number | null>(null);
  const previousMessagesRef = useRef<{
    count: number;
    lastUserMessageId?: string;
  } | null>(null);
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

  const lastUserMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === 'user') return messages[i]?.id;
    }
    return undefined;
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
      if (forceBottomFrameRef.current !== null)
        window.cancelAnimationFrame(forceBottomFrameRef.current);
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const previous = previousMessagesRef.current;
    previousMessagesRef.current = {
      count: messages.length,
      lastUserMessageId
    };

    if (!previous) return;

    const hasNewUserMessage =
      messages.length > previous.count &&
      Boolean(lastUserMessageId) &&
      lastUserMessageId !== previous.lastUserMessageId;

    if (!hasNewUserMessage || items.length === 0) return;

    if (anchorNavTimeoutRef.current) {
      window.clearTimeout(anchorNavTimeoutRef.current);
      anchorNavTimeoutRef.current = null;
    }
    isAnchorNavRef.current = false;

    if (forceBottomFrameRef.current !== null) {
      window.cancelAnimationFrame(forceBottomFrameRef.current);
    }

    forceBottomFrameRef.current = window.requestAnimationFrame(() => {
      forceBottomFrameRef.current = null;
      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      virtuosoRef.current?.scrollToIndex({
        index: items.length - 1,
        align: 'end',
        behavior: reduceMotion ? 'auto' : 'smooth'
      });
      setAtBottom(true);
    });
  }, [items.length, lastUserMessageId, messages.length]);

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
        components={VIRTUOSO_COMPONENTS}
        followOutput={atBottom ? 'auto' : false}
        atBottomStateChange={(bottom) => setAtBottom(bottom)}
        atBottomThreshold={80}
        rangeChanged={syncActiveFromRange}
        itemContent={(index, message) => {
          if (message.role === 'assistant-pending') {
            return (
              <div className="group mx-auto w-full max-w-4xl px-3 py-2.5 sm:px-6 sm:py-3">
                <AssistantPendingBubble />
              </div>
            );
          }

          const anchorId =
            message.role === 'user' ? `msg-${message.id}` : undefined;
          return (
            <div className="group mx-auto w-full max-w-4xl px-3 py-2.5 sm:px-6 sm:py-3">
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
          className="absolute bottom-4 right-[max(0.75rem,env(safe-area-inset-right))] z-10 h-9 w-9 rounded-full shadow-lg sm:bottom-5 sm:left-1/2 sm:right-auto sm:h-10 sm:w-10 sm:-translate-x-1/2"
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
