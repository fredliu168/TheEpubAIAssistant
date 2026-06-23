import { create } from 'zustand';
import type { AppSettings } from '../types';
import { persist } from 'zustand/middleware';

interface SettingsState extends AppSettings {
    updateSettings: (settings: Partial<AppSettings>) => void;
    setLLMConfig: (config: Partial<AppSettings['llm']>) => void;
    setTheme: (theme: 'light' | 'sepia' | 'dark') => void;
    fontSize: number;
    setFontSize: (size: number) => void;
    hasSeenLanding: boolean;
    setHasSeenLanding: (seen: boolean) => void;
}

const defaultLLM = {
    provider: 'openai' as const,
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4.1-mini',
    systemPrompt: 'Translate the following text into fluent Chinese, retaining formatting.',
    summaryPrompt: 'Please summarize the following article in Chinese. Focus on the main points, key arguments, and conclusions. Keep the summary concise but comprehensive.'
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            theme: 'light',
            llm: defaultLLM,
            fontSize: 100,
            hasSeenLanding: false,

            updateSettings: (newSettings) => set((state) => ({
                ...state,
                ...newSettings,
                llm: { ...state.llm, ...(newSettings.llm || {}) }
            })),

            setLLMConfig: (config) => set((state) => ({
                llm: { ...state.llm, ...config }
            })),

            setTheme: (theme) => set({ theme }),
            setFontSize: (size) => set({ fontSize: size }),
            setHasSeenLanding: (seen) => set({ hasSeenLanding: seen }),
        }),
        {
            name: 'reader-settings-storage', // unique name
        }
    )
);
