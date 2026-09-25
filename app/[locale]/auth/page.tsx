import {AuthClient} from '@/components/auth/AuthClient';
import {isPhoneAuthEnabled} from '@/lib/config/phone-auth';

export const dynamic = 'force-dynamic';

export default async function AuthPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;

  return <AuthClient locale={locale} phoneAuthEnabled={isPhoneAuthEnabled()} />;
}