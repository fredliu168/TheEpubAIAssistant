import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import en, { type TranslationKey } from './locales/en';
import zh from './locales/zh';
import ja from './locales/ja';
import de from './locales/de';
import fr from './locales/fr';

export type Locale = 'en' | 'zh' | 'ja' | 'de' | 'fr';

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { en, zh, ja, de, fr };

interface LocaleState {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    toggleLocale: () => void;
}

export const SUPPORTED_LOCALES = [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '中文' },
    { code: 'ja', label: '日本語' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Français' },
] as const;

const LOCALES: Locale[] = SUPPORTED_LOCALES.map(l => l.code);

export const useLocaleStore = create<LocaleState>()(
    persist(
        (set, get) => ({
            locale: 'zh',
            setLocale: (locale) => set({ locale }),
            toggleLocale: () => {
                const current = get().locale;
                const index = LOCALES.indexOf(current);
                const nextIndex = (index + 1) % LOCALES.length;
                set({ locale: LOCALES[nextIndex] });
            },
        }),
        { name: 'locale-storage' }
    )
);

/**
 * Translation hook. Returns the `t` function that looks up keys
 * in the current locale dictionary.
 *
 * Usage:
 *   const { t, locale, toggleLocale } = useLocale();
 *   <span>{t('common.signIn')}</span>
 *
 * Interpolation:
 *   t('sidebar.chapter', { n: 5 })  →  "Chapter 5" / "第 5 章"
 */
export function useLocale() {
    const { locale, setLocale, toggleLocale } = useLocaleStore();
    const dict = dictionaries[locale];

    const t = (key: TranslationKey, vars?: Record<string, string | number>): string => {
        let text = dict[key] ?? key;
        if (vars) {
            Object.entries(vars).forEach(([k, v]) => {
                text = text.replace(`{${k}}`, String(v));
            });
        }
        return text;
    };

    return { t, locale, setLocale, toggleLocale };
}
