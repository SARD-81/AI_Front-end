import {AuthClient} from '@/components/auth/AuthClient';

export default async function AuthPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;

  return <AuthClient locale={locale} />;
}
