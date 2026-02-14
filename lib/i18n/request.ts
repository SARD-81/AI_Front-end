import {getRequestConfig} from 'next-intl/server';
import {defaultLocale, locales} from './config';

export default getRequestConfig(async ({requestLocale}) => {
  const locale = await requestLocale;
  const activeLocale = locales.includes(locale as (typeof locales)[number]) ? locale : defaultLocale;

  return {
    locale: activeLocale,
    messages: (await import(`../../messages/${activeLocale}.json`)).default,
    timeZone: 'Asia/Tehran'
  };
});
