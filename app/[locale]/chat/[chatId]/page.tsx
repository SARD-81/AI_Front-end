import {ChatShell} from '@/components/chat/ChatShell';

export default async function ChatPage({
  params
}: {
  params: Promise<{locale: string; chatId: string}>;
}) {
  const {locale, chatId} = await params;
  return <ChatShell locale={locale} chatId={chatId} />;
}
