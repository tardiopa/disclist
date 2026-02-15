'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useDictionary } from '@/i18n/DictionaryContext'
import { Globe, ChevronDown, Check } from 'lucide-react'

const LANGUAGES = [
    { locale: 'en', label: 'English' },
    { locale: 'fr', label: 'Français' },
]

export function LanguageSwitcher() {
    const { locale, dict } = useDictionary()
    const pathname = usePathname()
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    const current = LANGUAGES.find(l => l.locale === locale) || LANGUAGES[0]

    const switchTo = (targetLocale: string) => {
        setOpen(false)
        if (targetLocale === locale) return
        const newPath = pathname.replace(/^\/[a-z]{2}(\/|$)/, `/${targetLocale}$1`)
        document.cookie = `NEXT_LOCALE=${targetLocale}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`
        window.location.href = newPath
    }

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div ref={ref} className="relative">
            {open && (
                <div className="absolute bottom-full mb-2 left-0 w-44 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-10">
                    {LANGUAGES.map((lang) => (
                        <button
                            key={lang.locale}
                            onClick={() => switchTo(lang.locale)}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-slate-700"
                        >
                            <span className={locale === lang.locale ? 'font-medium text-slate-900' : ''}>{lang.label}</span>
                            {locale === lang.locale && <Check className="h-3.5 w-3.5 text-slate-900" />}
                        </button>
                    ))}
                </div>
            )}
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors w-full"
            >
                <Globe className="h-4 w-4 shrink-0" />
                <span>{dict.language}: {current.label}</span>
                <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-150 ml-auto ${open ? 'rotate-180' : ''}`} />
            </button>
        </div>
    )
}
