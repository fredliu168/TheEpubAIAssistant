import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TranslationState {
    // Key format: `${bookId}:${chapterId}` -> Map<paragraphIndex, translationText>
    // Since JSON.stringify doesn't handle Map, we store as object/record
    translations: Record<string, Record<number, string>>;

    setTranslation: (bookId: string, chapterId: string, index: number, text: string) => void;
    clearChapterTranslation: (bookId: string, chapterId: string) => void;
    getChapterTranslations: (bookId: string, chapterId: string) => Map<number, string>;
}

export const useTranslationStore = create<TranslationState>()(
    persist(
        (set, get) => ({
            translations: {},

            setTranslation: (bookId, chapterId, index, text) =>
                set((state) => {
                    const key = `${bookId}:${chapterId}`;
                    const currentChapterTranslations = state.translations[key] || {};
                    return {
                        translations: {
                            ...state.translations,
                            [key]: {
                                ...currentChapterTranslations,
                                [index]: text,
                            },
                        },
                    };
                }),

            clearChapterTranslation: (bookId, chapterId) =>
                set((state) => {
                    const key = `${bookId}:${chapterId}`;
                    const { [key]: _, ...rest } = state.translations; // Remove key
                    return { translations: rest };
                }),

            getChapterTranslations: (bookId, chapterId) => {
                const key = `${bookId}:${chapterId}`;
                const record = get().translations[key];
                if (!record) return new Map();

                // Convert Record<string, string> back to Map<number, string>
                const map = new Map<number, string>();
                Object.entries(record).forEach(([k, v]) => {
                    map.set(Number(k), v);
                });
                return map;
            },
        }),
        {
            name: 'translation-storage', // persist to localStorage
            // Custom storage options can be added here if needed (e.g. IndexedDB via idb-keyval for large data)
            // LocalStorage has 5MB limit which might be small for large books translations.
            // But for text translations it's usually fine for reasonable usage.
        }
    )
);
