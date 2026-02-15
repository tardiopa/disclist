import 'server-only'

export type Locale = 'en' | 'fr'

export const locales: Locale[] = ['en', 'fr']
export const defaultLocale: Locale = 'en'

const dictionaries = {
    en: () => import('./dictionaries/en.json').then((m) => m.default),
    fr: () => import('./dictionaries/fr.json').then((m) => m.default),
}

export async function getDictionary(locale: string) {
    const safeLocale = locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale
    return dictionaries[safeLocale]()
}

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>
