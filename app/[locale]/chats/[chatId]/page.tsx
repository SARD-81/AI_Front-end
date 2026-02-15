import {redirect} from 'next/navigation';

export default async function ChatsCompatibilityDetailPage({
  params
}: {
  params: Promise<{locale: string; chatId: string}>;
}) {
  const {locale, chatId} = await params;
  redirect(`/${locale}/chat/${chatId}`);
}
