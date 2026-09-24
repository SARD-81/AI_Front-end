import {handlePhoneResetComplete} from '@/lib/server/phone-auth-bff';

export async function POST(request: Request) {
  return handlePhoneResetComplete(request);
}
