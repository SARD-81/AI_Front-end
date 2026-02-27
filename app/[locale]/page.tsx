import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';

export default async function LocalePage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const hasRefresh = (await cookies()).get('sbu_refresh');

  if (hasRefresh) {
    redirect(`/${locale}/chat`);
  }

  redirect(`/${locale}/auth?mode=login`);
}
