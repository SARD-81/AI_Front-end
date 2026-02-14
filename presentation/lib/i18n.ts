type Locale = "fa-IR";

const dictionary: Record<Locale, Record<string, string>> = {
  "fa-IR": {
    appTitle: "دستیار هوش مصنوعی",
  },
};

export function t(key: string, locale: Locale = "fa-IR") {
  return dictionary[locale][key] ?? key;
}
