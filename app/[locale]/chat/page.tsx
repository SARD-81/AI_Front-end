import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {ChatShell} from '@/components/chat/ChatShell';

export default async function ChatIndexPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const hasRefresh = (await cookies()).get('sbu_refresh');

  if (!hasRefresh) {
    redirect(`/${locale}/auth?mode=login&next=${encodeURIComponent(`/${locale}/chat`)}`);
  }

  return <ChatShell locale={locale} />;
}
