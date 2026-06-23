// src/types/index.ts

// 书籍模型
export interface Book {
    id: string;          // UUID
    metadata: {
        title: string;
        author: string;
        publisher?: string;
        pubDate?: string;
        subject?: string;
        coverUrl?: string; // Blob URL
        coverBlob?: Blob;  // Raw data for persistence
    };
    spine: string[];     // 章节 ID 顺序列表
    toc: TOCItem[];      // 目录树
}

export interface TOCItem {
    id: string;
    label: string;
    href: string;
    children?: TOCItem[];
}

// 用户配置
export interface AppSettings {
    theme: 'light' | 'dark' | 'sepia';
    llm: {
        provider: 'openai' | 'deepseek' | 'custom';
        apiKey: string;
        baseUrl: string;
        model: string;
        systemPrompt: string; // "你是一个专业翻译..."
        summaryPrompt: string;
    };
    fontSize: number;
    hasSeenLanding: boolean;
}

// 平台适配器接口
export interface IPlatformBridge {
    // 核心：解决插件跨域问题
    fetchStream(
        url: string,
        options: RequestInit,
        onChunk: (text: string) => void
    ): Promise<void>;

    // 核心：统一存储
    storage: {
        get<T>(key: string): Promise<T | null>;
        set<T>(key: string, value: T): Promise<void>;
    };
}

// DB Entities
export interface BookEntity extends Book {
    addedAt: number;
}

export interface TranslationEntity {
    hash: string;
    bookId: string;
    timestamp: number;
    original: string;
    translated: string;
}
