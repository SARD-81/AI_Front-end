import {AuthScreen} from '@/components/auth/AuthScreen';

export default async function AuthPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;

  return <AuthScreen locale={locale} />;
}
