import { crossSiteRejection } from '@/lib/server/request-origin';
import { refuseLegacyPublicAuth } from '@/lib/server/legacy-public-auth';

export async function POST(request: Request) {
  const rejected = crossSiteRejection(request);
  if (rejected) return rejected;
  return refuseLegacyPublicAuth('reset');
}
