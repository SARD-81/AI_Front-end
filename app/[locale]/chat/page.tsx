import {ChatShell} from '@/components/chat/ChatShell';

export default async function ChatIndexPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  return <ChatShell locale={locale} />;
}
