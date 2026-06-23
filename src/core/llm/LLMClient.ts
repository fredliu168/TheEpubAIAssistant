export interface LLMConfig {
    apiKey: string;
    baseUrl: string;
    model: string;
    systemPrompt?: string;
    summaryPrompt?: string;
    initialRetryDelay?: number;
}

interface StreamRequestOptions {
    disableReasoning?: boolean;
}

interface RequestVariant {
    includeReasoningEffort?: boolean;
    includeQwenThinkingFlags?: boolean;
    includeQwenNoThinkPrompt?: boolean;
}

export class LLMClient {
    private config: LLMConfig;

    constructor(config: LLMConfig) {
        this.config = config;
    }

    private validateConfig() {
        if (!this.config.baseUrl?.trim()) {
            throw new Error('Missing LLM Base URL');
        }

        if (!this.config.model?.trim()) {
            throw new Error('Missing LLM model');
        }

        if (!this.config.apiKey?.trim()) {
            throw new Error('Missing LLM API key');
        }
    }

    private buildHeaders(): HeadersInit {
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
            'X-API-Key': this.config.apiKey,
        };
    }

    private isQwenThinkingModel() {
        const model = this.config.model.trim().toLowerCase();
        return model.includes('qwen3');
    }

    private buildRequestBody(
        systemPrompt: string,
        userContent: string,
        variant: RequestVariant = {}
    ) {
        const systemContent = variant.includeQwenNoThinkPrompt
            ? `/no_think\n${systemPrompt}`
            : systemPrompt;

        return {
            model: this.config.model,
            messages: [
                { role: 'system', content: systemContent },
                { role: 'user', content: userContent }
            ],
            stream: true,
            ...(variant.includeReasoningEffort ? { reasoning_effort: 'none' } : {}),
            ...(variant.includeQwenThinkingFlags
                ? {
                    enable_thinking: false,
                    chat_template_kwargs: {
                        enable_thinking: false
                    }
                }
                : {})
        };
    }

    private isUnsupportedParameterError(responseText: string) {
        const normalized = responseText.toLowerCase();
        return normalized.includes('reasoning_effort')
            || normalized.includes('enable_thinking')
            || normalized.includes('chat_template_kwargs')
            || normalized.includes('unsupported')
            || normalized.includes('unknown parameter')
            || normalized.includes('extra fields not permitted')
            || normalized.includes('invalid parameter');
    }

    private buildRequestVariants(options: StreamRequestOptions = {}) {
        if (!options.disableReasoning) {
            return [{} satisfies RequestVariant];
        }

        if (this.isQwenThinkingModel()) {
            return [
                {
                    includeReasoningEffort: true,
                    includeQwenThinkingFlags: true,
                    includeQwenNoThinkPrompt: true
                },
                {
                    includeReasoningEffort: true,
                    includeQwenThinkingFlags: true
                },
                {
                    includeReasoningEffort: true,
                    includeQwenNoThinkPrompt: true
                },
                {
                    includeQwenNoThinkPrompt: true
                },
                {
                    includeReasoningEffort: true
                }
            ] satisfies RequestVariant[];
        }

        return [
            {
                includeReasoningEffort: true
            }
        ] satisfies RequestVariant[];
    }

    private async streamRequest(
        systemPrompt: string,
        userContent: string,
        onPartial: (text: string) => void,
        options: StreamRequestOptions = {}
    ): Promise<string> {
        this.validateConfig();

        let response: Response | undefined;
        let attempt = 0;
        const maxRetries = 3;
        let delay = this.config.initialRetryDelay || 1000;
        const requestVariants = this.buildRequestVariants(options);
        let variantIndex = 0;

        while (true) {
            attempt++;
            try {
                response = await fetch(this.config.baseUrl, {
                    method: 'POST',
                    headers: this.buildHeaders(),
                    body: JSON.stringify(this.buildRequestBody(systemPrompt, userContent, requestVariants[variantIndex]))
                });

                if (response.status === 400 && options.disableReasoning) {
                    const errorText = await response.text();
                    if (this.isUnsupportedParameterError(errorText) && variantIndex < requestVariants.length - 1) {
                        variantIndex += 1;
                        attempt = 0;
                        delay = this.config.initialRetryDelay || 1000;
                        continue;
                    }
                    throw new Error(`API Error: ${response.status} ${errorText}`);
                }

                if (response.status === 429 && attempt <= maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                    continue;
                }

                break;
            } catch (error) {
                if (attempt <= maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                    continue;
                }

                throw error;
            }
        }

        if (!response || !response.ok) {
            throw new Error(`API Error: ${response?.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Response body not readable');
        }

        const decoder = new TextDecoder();
        let accumulated = '';
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:')) continue;

                const data = trimmed.slice(5).trim();
                if (!data || data === '[DONE]') continue;

                try {
                    const json = JSON.parse(data);
                    const content = json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content;
                    if (content) {
                        accumulated += content;
                        onPartial(content);
                    }
                } catch {
                    // Ignore invalid SSE chunks and continue reading.
                }
            }
        }

        return accumulated;
    }

    async translate(text: string, onPartial: (text: string) => void): Promise<string> {
        const prompt = this.config.systemPrompt || 'Translate the following text into fluent Chinese, retaining formatting.';
        return this.streamRequest(prompt, text, onPartial, { disableReasoning: true });
    }

    async summarize(text: string, onPartial: (text: string) => void): Promise<string> {
        const prompt = this.config.summaryPrompt ||
            'Please summarize the following article in Chinese. Focus on the main points, key arguments, and conclusions. Keep the summary concise but comprehensive.';
        return this.streamRequest(prompt, text, onPartial, { disableReasoning: true });
    }

    async translateParagraphs(
        paragraphs: string[],
        onParagraphUpdate: (index: number, text: string) => void
    ): Promise<void> {
        const systemPrompt = this.config.systemPrompt || 'You are a professional translator. Translate the following text into fluent, natural Chinese. Only output the translation.';

        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs[i];
            if (!paragraph?.trim()) continue;

            const userPrompt = `Translate this paragraph:\n\n${paragraph}`;
            let currentTranslation = '';

            try {
                await this.streamRequest(systemPrompt, userPrompt, (delta) => {
                    currentTranslation += delta;
                    onParagraphUpdate(i, currentTranslation);
                }, { disableReasoning: true });
            } catch (error) {
                console.error(`Failed to translate paragraph ${i}:`, error);
                onParagraphUpdate(i, '[Translation Failed]');
            }
        }
    }

    async translateWord(word: string): Promise<string> {
        const prompt = `You are a concise English-Chinese dictionary. For the given English word or phrase, provide:
1. Chinese translation
2. Phonetic transcription (IPA)
3. Part of speech
4. A brief example sentence

Format: translation | /IPA/ | part of speech
Example: word

Keep it very short and concise. Output in plain text, no markdown.`;
        let result = '';
        await this.streamRequest(prompt, word, (partial) => {
            result += partial;
        }, { disableReasoning: true });
        return result.trim();
    }

    async translateSelection(text: string): Promise<string> {
        const prompt = `You are a professional translator. Translate the following text into fluent, natural Chinese.
If it is a single word, provide the definition.
If it is a sentence or phrase, provide a direct translation.
Keep the output concise.`;

        let result = '';
        await this.streamRequest(prompt, text, (partial) => {
            result += partial;
        }, { disableReasoning: true });
        return result.trim();
    }
}
