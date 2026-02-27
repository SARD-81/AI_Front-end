import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {ChatShell} from '@/components/chat/ChatShell';

export default async function ChatPage({
  params
}: {
  params: Promise<{locale: string; chatId: string}>;
}) {
  const {locale, chatId} = await params;
  const hasRefresh = (await cookies()).get('sbu_refresh');

  if (!hasRefresh) {
    const next = `/${locale}/chat/${chatId}`;
    redirect(`/${locale}/auth?mode=login&next=${encodeURIComponent(next)}`);
  }

  return <ChatShell locale={locale} chatId={chatId} />;
}
