import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {ProfileForm} from '@/components/profile/ProfileForm';

export default async function ProfilePage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  const hasRefresh = (await cookies()).get('sbu_refresh');

  if (!hasRefresh) {
    redirect(`/${locale}/auth?mode=login&next=${encodeURIComponent(`/${locale}/profile`)}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <ProfileForm locale={locale} />
    </main>
  );
}
