import { useState, useCallback, useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useReaderStore } from '../store/useReaderStore'; // Need currentBook ID
import { useTranslationStore } from '../store/useTranslationStore';
import { LLMClient } from '../core/llm/LLMClient';

export const useInlineTranslation = (currentChapterId: string | null) => {
    const { llm } = useSettingsStore();
    const { currentBook } = useReaderStore();
    const { setTranslation, clearChapterTranslation, getChapterTranslations } = useTranslationStore();

    // Local state for UI
    const [translations, setTranslations] = useState<Map<number, string>>(new Map());
    const [isTranslating, setIsTranslating] = useState(false);
    const [isActive, setIsActive] = useState(false);
    // When chapter changes, restore cached translations or reset
    // When chapter or book changes, restore cached translations or reset
    useEffect(() => {
        if (!currentChapterId || !currentBook) {
            setTranslations(new Map());
            setIsActive(false);
            return;
        }

        const cached = getChapterTranslations(currentBook.id, currentChapterId);
        if (cached && cached.size > 0) {
            setTranslations(cached);
            setIsActive(true);
        } else {
            setTranslations(new Map());
            setIsActive(false);
        }
    }, [currentChapterId, currentBook, getChapterTranslations]);

    const extractParagraphs = (html: string): string[] => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const elements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
        const texts: string[] = [];
        elements.forEach((el) => {
            const text = el.textContent?.trim();
            if (text && text.length > 0) {
                texts.push(text);
            }
        });
        return texts;
    };

    const startTranslation = useCallback(async (html: string) => {
        if (!currentChapterId) {
            return;
        }

        const paragraphs = extractParagraphs(html);
        if (paragraphs.length === 0) return;

        if (paragraphs.length === 0) return;

        setIsTranslating(true);
        setIsActive(true);

        // Don't clear immediately if we want to support resume/incremental? 
        // For now, let's clear local state to avoid confusion, or keep it?
        // If we want to overwrite, clear it.
        setTranslations(new Map());
        if (currentBook) {
            clearChapterTranslation(currentBook.id, currentChapterId);
        }

        const chapterId = currentChapterId;
        const bookId = currentBook?.id;

        if (!bookId) {
            setIsTranslating(false);
            return;
        }

        try {
            const client = new LLMClient(llm);
            await client.translateParagraphs(paragraphs, (index, text) => {
                // Update local state for immediate feedback
                setTranslations((prev) => {
                    const next = new Map(prev);
                    next.set(index, text);
                    return next;
                });
                // Update persistent store
                setTranslation(bookId, chapterId, index, text);
            });
        } catch (error) {
            console.error('Inline translation failed', error);
        } finally {
            setIsTranslating(false);
        }
    }, [llm, currentChapterId, currentBook, setTranslation, clearChapterTranslation]);

    const clearTranslation = useCallback(() => {
        if (currentChapterId && currentBook) {
            clearChapterTranslation(currentBook.id, currentChapterId);
        }
        setTranslations(new Map());
        setIsActive(false);
        setIsTranslating(false);
    }, [currentChapterId, currentBook, clearChapterTranslation]);

    return {
        translations,
        isTranslating,
        isActive,
        startTranslation,
        clearTranslation,
    };
};
