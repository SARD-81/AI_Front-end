import {NextIntlClientProvider, type AbstractIntlMessages} from 'next-intl';
import faMessages from '@/messages/fa.json';
import {NotFoundView} from '@/components/errors/NotFoundView';

export default function GlobalNotFoundPage() {
  return (
    <NextIntlClientProvider locale="fa" messages={faMessages as unknown as AbstractIntlMessages}>
      <NotFoundView locale="fa" />
    </NextIntlClientProvider>
  );
}
