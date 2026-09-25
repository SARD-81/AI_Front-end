import {handlePhoneResetVerify} from '@/lib/server/phone-auth-bff';

export async function POST(request: Request) {
  return handlePhoneResetVerify(request);
}
