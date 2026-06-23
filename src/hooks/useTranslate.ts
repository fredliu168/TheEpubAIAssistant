import { useState, useCallback } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { LLMClient } from '../core/llm/LLMClient';

export const useTranslate = () => {
    const { llm } = useSettingsStore();
    const [isTranslating, setIsTranslating] = useState(false);
    const [translation, setTranslation] = useState('');

    const translate = useCallback(async (text: string) => {
        setIsTranslating(true);
        setTranslation('');

        try {
            const client = new LLMClient(llm);
            await client.translate(text, (partial) => {
                setTranslation((prev) => prev + partial);
            });
        } catch (error) {
            console.error('Translation failed', error);
            setTranslation('Error: Translation failed.');
        } finally {
            setIsTranslating(false);
        }
    }, [llm]);

    return { translate, isTranslating, translation, setTranslation };
};
