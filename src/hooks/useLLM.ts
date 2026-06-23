import { useState, useCallback } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { LLMClient } from '../core/llm/LLMClient';

export type LLMMode = 'translate' | 'summarize';

export const useLLM = () => {
    const { llm } = useSettingsStore();
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState('');
    const [mode, setMode] = useState<LLMMode>('translate');

    const translate = useCallback(async (text: string) => {
        setIsProcessing(true);
        setResult('');
        setMode('translate');

        try {
            const client = new LLMClient(llm);
            await client.translate(text, (partial) => {
                setResult((prev) => prev + partial);
            });
        } catch (error) {
            console.error('Translation failed', error);
            setResult(error instanceof Error ? error.message : 'Translation failed.');
        } finally {
            setIsProcessing(false);
        }
    }, [llm]);

    const summarize = useCallback(async (text: string) => {
        setIsProcessing(true);
        setResult('');
        setMode('summarize');

        try {
            const client = new LLMClient(llm);
            await client.summarize(text, (partial) => {
                setResult((prev) => prev + partial);
            });
        } catch (error) {
            console.error('Summarization failed', error);
            setResult(error instanceof Error ? error.message : 'Summarization failed.');
        } finally {
            setIsProcessing(false);
        }
    }, [llm]);

    const clearResult = useCallback(() => {
        setResult('');
    }, []);

    return {
        translate,
        summarize,
        isProcessing,
        result,
        mode,
        clearResult,
        setResult
    };
};

// Keep backward compatibility
export const useTranslate = () => {
    const { translate, isProcessing, result, setResult } = useLLM();
    return {
        translate,
        isTranslating: isProcessing,
        translation: result,
        setTranslation: setResult
    };
};
