import React from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useLocale } from '../../i18n';

export const SettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { llm, setLLMConfig, setHasSeenLanding } = useSettingsStore();
    const { t } = useLocale();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{t('settings.modal.title')}</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            {t('settings.modal.description')}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-700">
                        ×
                    </button>
                </div>

                <div className="max-h-[75vh] space-y-5 overflow-y-auto px-6 py-5">
                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-gray-700">Provider</span>
                        <select
                            value={llm.provider}
                            onChange={(e) => setLLMConfig({ provider: e.target.value as typeof llm.provider })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#E3120B]"
                        >
                            <option value="openai">OpenAI</option>
                            <option value="deepseek">DeepSeek</option>
                            <option value="custom">Custom</option>
                        </select>
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-gray-700">Base URL</span>
                        <input
                            type="url"
                            value={llm.baseUrl}
                            onChange={(e) => setLLMConfig({ baseUrl: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#E3120B]"
                            placeholder="https://api.openai.com/v1/chat/completions"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-gray-700">API Key</span>
                        <input
                            type="password"
                            value={llm.apiKey}
                            onChange={(e) => setLLMConfig({ apiKey: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#E3120B]"
                            placeholder="sk-..."
                        />
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-gray-700">Model</span>
                        <input
                            type="text"
                            value={llm.model}
                            onChange={(e) => setLLMConfig({ model: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#E3120B]"
                            placeholder="gpt-4.1-mini"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-gray-700">{t('settings.modal.translationPrompt')}</span>
                        <textarea
                            value={llm.systemPrompt}
                            onChange={(e) => setLLMConfig({ systemPrompt: e.target.value })}
                            className="min-h-28 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#E3120B]"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-medium text-gray-700">{t('settings.modal.summaryPrompt')}</span>
                        <textarea
                            value={llm.summaryPrompt}
                            onChange={(e) => setLLMConfig({ summaryPrompt: e.target.value })}
                            className="min-h-28 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#E3120B]"
                        />
                    </label>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        {t('settings.modal.missingConfig')}
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
                    <button
                        onClick={() => setHasSeenLanding(false)}
                        className="text-sm font-medium text-[#E3120B] hover:text-red-700"
                    >
                        {t('settings.modal.showWelcome')}
                    </button>
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-[#E3120B] px-4 py-2 text-sm font-medium text-white hover:bg-[#c20f09]"
                    >
                        {t('settings.modal.done')}
                    </button>
                </div>
            </div>
        </div>
    );
};
