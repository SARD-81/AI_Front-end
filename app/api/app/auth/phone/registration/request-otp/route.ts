import {handleRegistrationRequestOtp} from '@/lib/server/phone-auth-bff';

export async function POST(request: Request) {
  return handleRegistrationRequestOtp(request);
}
