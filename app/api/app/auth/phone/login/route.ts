import {handlePhoneLogin} from '@/lib/server/phone-auth-bff';

export async function POST(request: Request) {
  return handlePhoneLogin(request);
}
