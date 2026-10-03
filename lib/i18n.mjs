export const DEFAULT_LOCALE = 'en';
export const LOCALES = ['en', 'fr'];

export const LOCALE_NAMES = {
    en: 'English',
    fr: 'Français',
};

export function createTranslator(strings) {
    return function t(locale, key, vars = {}) {
        const dict = strings[locale] ?? strings[DEFAULT_LOCALE];
        const template = dict[key] ?? strings[DEFAULT_LOCALE]?.[key] ?? key;
        return String(template).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
    };
}

export function localeHref(targetLocale, currentLocale, localeRoot) {
    if (targetLocale === currentLocale) return '.';
    return targetLocale === DEFAULT_LOCALE ? localeRoot : `${localeRoot}${targetLocale}/`;
}
