import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Viewer } from '../viewer/Viewer';
import { useReaderStore } from '../../store/useReaderStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { SettingsModal } from '../settings/SettingsModal';
import { useLLM, type LLMMode } from '../../hooks/useLLM';
import { useInlineTranslation } from '../../hooks/useInlineTranslation';
import { ChevronDown } from 'lucide-react';
import { useLocale, SUPPORTED_LOCALES } from '../../i18n';
import { create } from 'zustand';
import myIcon from '../../assets/my.svg';
import translateIcon from '../../assets/translate.svg';
import summarizeIcon from '../../assets/summarize.svg';
import homeIcon from '../../assets/home.svg';

interface SummaryCacheState {
    summaries: Record<string, string>;
    setSummary: (chapterId: string, text: string) => void;
}

const useSummaryCacheStore = create<SummaryCacheState>((set) => ({
    summaries: {},
    setSummary: (chapterId, text) => set((state) => ({
        summaries: { ...state.summaries, [chapterId]: text }
    })),
}));

export const ReaderLayout: React.FC = () => {
    const { t, locale, setLocale } = useLocale();
    const { currentChapterId, chapterContentCache, parser, cacheChapter, setLoading, closeBook } = useReaderStore();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [activeSummaryChapterId, setActiveSummaryChapterId] = useState<string | null>(null);
    const [openSummaryChapterId, setOpenSummaryChapterId] = useState<string | null>(null);
    const [hoveredSummaryChapterId, setHoveredSummaryChapterId] = useState<string | null>(null);
    const [dismissedSummaryChapterIds, setDismissedSummaryChapterIds] = useState<Record<string, boolean>>({});
    const { summarize, isProcessing, result, mode, clearResult } = useLLM();
    const { translations, isTranslating, isActive: isTranslationActive, startTranslation, clearTranslation } = useInlineTranslation(currentChapterId);
    const { summaries, setSummary } = useSummaryCacheStore();

    // Sync streaming summary result into cache — only for the chapter it was requested for
    React.useEffect(() => {
        if (currentChapterId && result && mode === 'summarize' && activeSummaryChapterId === currentChapterId) {
            setSummary(currentChapterId, result);
        }
    }, [activeSummaryChapterId, currentChapterId, mode, result, setSummary]);

    React.useEffect(() => {
        const loadChapter = async () => {
            if (!currentChapterId || !parser) return;
            if (chapterContentCache[currentChapterId]) return;

            setLoading(true);
            try {
                const content = await parser.getChapter(currentChapterId);
                cacheChapter(currentChapterId, content);
            } catch (e) {
                console.error('Failed to load chapter', e);
            } finally {
                setLoading(false);
            }
        };
        loadChapter();
    }, [currentChapterId, parser, chapterContentCache, cacheChapter, setLoading]);

    const handleNavigate = (href: string) => {
        if (!currentChapterId) return;

        const targetPath = href.split('#')[0];
        const currentDir = currentChapterId.substring(0, currentChapterId.lastIndexOf('/'));
        const base = currentDir ? currentDir + '/' : '';

        const parts = (base + targetPath).split('/');
        const resolved: string[] = [];
        for (const part of parts) {
            if (part === '.' || part === '') continue;
            if (part === '..') {
                resolved.pop();
            } else {
                resolved.push(part);
            }
        }
        const resolvedPath = resolved.join('/');

        const { currentBook, setCurrentChapterId } = useReaderStore.getState();
        if (currentBook?.spine.includes(resolvedPath)) {
            setCurrentChapterId(resolvedPath);
        } else {
            const match = currentBook?.spine.find(s => s.endsWith(targetPath) || s.endsWith(resolvedPath));
            if (match) {
                setCurrentChapterId(match);
            } else {
                console.warn('Could not find chapter:', resolvedPath, 'from href:', href);
            }
        }
    };

    const chapterContent = currentChapterId ? (chapterContentCache[currentChapterId] || '') : '';
    const cachedSummary = currentChapterId ? (summaries[currentChapterId] || '') : '';
    const isSummaryDismissed = currentChapterId ? Boolean(dismissedSummaryChapterIds[currentChapterId]) : false;
    const liveSummary = currentChapterId && mode === 'summarize' && activeSummaryChapterId === currentChapterId
        ? result
        : '';
    const panelSummary = liveSummary || cachedSummary;
    const aiPanelOpen = Boolean(currentChapterId && (openSummaryChapterId === currentChapterId || (cachedSummary && !isSummaryDismissed)));
    const aiPanelExpanded = Boolean(currentChapterId && openSummaryChapterId === currentChapterId);
    const aiPanelHovered = Boolean(currentChapterId && hoveredSummaryChapterId === currentChapterId);
    const aiPanelVisible = aiPanelExpanded || aiPanelHovered;

    const extractText = (html: string, maxLength: number = 4000) => {
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, maxLength);
    };

    const handleTranslate = () => {
        if (isTranslationActive) {
            clearTranslation();
        } else {
            startTranslation(chapterContent);
        }
    };

    const handleBackToLibrary = () => {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete('book');
        window.history.replaceState({}, '', nextUrl.toString());
        closeBook();
    };

    const handleSummarize = () => {
        if (!currentChapterId) {
            return;
        }

        if (currentChapterId) {
            setDismissedSummaryChapterIds((prev) => {
                const next = { ...prev };
                delete next[currentChapterId];
                return next;
            });
        }
        setActiveSummaryChapterId(currentChapterId);
        setOpenSummaryChapterId(currentChapterId);
        setHoveredSummaryChapterId(currentChapterId);

        if (summaries[currentChapterId]) {
            clearResult();
            return;
        }

        clearResult();
        const text = extractText(chapterContent);
        summarize(text);
    };

    const toggleSummaryPanel = () => {
        if (!currentChapterId) {
            return;
        }

        if (openSummaryChapterId === currentChapterId) {
            setOpenSummaryChapterId(null);
            setHoveredSummaryChapterId(null);
            return;
        }

        setOpenSummaryChapterId(currentChapterId);
        setHoveredSummaryChapterId(currentChapterId);
    };

    const getPanelTitle = (currentMode: LLMMode) => {
        return currentMode === 'translate' ? t('reader.aiTranslation') : t('reader.aiSummary');
    };



    return (
        <div className="flex flex-col h-full w-full">
            {/* Header */}
            <div className={`
                flex items-center justify-between p-4 bg-[#E3120B] text-white shadow-md z-10
                ${sidebarOpen ? 'pl-72' : 'pl-4'} transition-all duration-300 font-serif
            `}>
                <div className="flex items-center">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 rounded hover:bg-white/10 mr-4"
                    >
                        ☰
                    </button>
                    <h1
                        className="text-xl font-bold truncate max-w-xs sm:max-w-md cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={handleBackToLibrary}
                        title={t('reader.backToLibrary')}
                    >
                        {t('app.title')}
                    </h1>
                </div>

                <div className="flex space-x-2">
                    {/* Font Size Slider */}
                    <div className="flex items-center gap-2 mr-4 bg-white/10 px-2 py-1 rounded hidden sm:flex">
                        <button
                            className="text-xs hover:text-gray-300 w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                            onClick={() => {
                                const currentSize = useSettingsStore.getState().fontSize || 100;
                                useSettingsStore.getState().setFontSize(Math.max(50, currentSize - 10));
                            }}
                            title={t('reader.decreaseFontSize')}
                        >
                            A-
                        </button>
                        <input
                            type="range"
                            min="50"
                            max="200"
                            value={useSettingsStore((state) => state.fontSize) || 100}
                            onChange={(e) => useSettingsStore.getState().setFontSize(Number(e.target.value))}
                            className="w-24 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                        <button
                            className="text-xs hover:text-gray-300 w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                            onClick={() => {
                                const currentSize = useSettingsStore.getState().fontSize || 100;
                                useSettingsStore.getState().setFontSize(Math.min(200, currentSize + 10));
                            }}
                            title={t('reader.increaseFontSize')}
                        >
                            A+
                        </button>
                    </div>

                    <button
                        onClick={handleBackToLibrary}
                        className="px-3 py-1 font-bold rounded text-sm hover:bg-white/10 mr-2 flex items-center gap-1"
                        title={t('reader.backToLibrary')}
                    >
                        <img src={homeIcon} alt={t('common.home')} className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleTranslate}
                        disabled={isTranslating || !chapterContent}
                        className={`px-3 py-1 font-bold rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isTranslationActive
                            ? 'bg-yellow-400 text-white hover:bg-yellow-500' // Keeping yellow for active state to indicate it's on
                            : 'text-white hover:bg-white/10' // Transparent for inactive
                            }`}
                        title={isTranslating ? t('reader.translating') : isTranslationActive ? t('reader.clearTranslation') : t('reader.translate')}
                    >
                        {isTranslating ? (
                            <span className="animate-pulse">...</span>
                        ) : (
                            <img src={translateIcon} alt={t('reader.translate')} className="w-5 h-5" />
                        )}
                    </button>
                    <button
                        onClick={handleSummarize}
                        disabled={isProcessing || !chapterContent}
                        className="px-3 py-1 text-white font-bold rounded text-sm hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={t('reader.summarize')}
                    >
                        {isProcessing ? (
                            <span className="animate-pulse">...</span>
                        ) : (
                            <img src={summarizeIcon} alt={t('reader.summarize')} className="w-5 h-5" />
                        )}
                    </button>
                    <button
                        onClick={() => {
                            setSettingsOpen(true);
                        }}
                        className="px-3 py-1 text-white rounded text-sm hover:bg-white/10 flex items-center gap-1"
                        title={t('common.me')}
                    >
                        <img src={myIcon} alt={t('common.me')} className="w-5 h-5" />
                    </button>
                    <div className="relative group">
                        <button className="px-2 py-1 text-white hover:bg-white/10 rounded transition-colors text-xs border border-white/20 flex items-center gap-1">
                            <span>{SUPPORTED_LOCALES.find(l => l.code === locale)?.label}</span>
                            <ChevronDown size={14} />
                        </button>
                        <div className="absolute right-0 top-full pt-2 w-32 hidden group-hover:block z-50">
                            <div className="bg-white rounded-md shadow-xl py-1 border border-gray-100 text-left">
                                {SUPPORTED_LOCALES.map(lang => (
                                    <button
                                        key={lang.code}
                                        onClick={() => setLocale(lang.code)}
                                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${locale === lang.code ? 'text-[#E3120B] font-bold bg-red-50' : 'text-gray-700'}`}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar */}
                <div className={`
                    absolute top-0 bottom-0 left-0 transition-transform duration-300 transform bg-white z-20 shadow-xl
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>
                    <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
                </div>

                {/* Main Content */}
                <div
                    className="flex-1 transition-all duration-300 relative"
                    style={{ marginLeft: sidebarOpen ? '320px' : '0' }}
                >
                    <Viewer
                        html={chapterContent || '<div class="p-10 text-center text-gray-500">Select a chapter</div>'}
                        onNavigate={handleNavigate}
                        translations={isTranslationActive ? translations : undefined}
                    />
                </div>

                {/* AI Panel — auto-hide/show on hover via transform (no layout reflow) */}
                {aiPanelOpen && (
                    <div
                        className="absolute top-0 bottom-0 right-0 z-30"
                        style={{ width: '420px', pointerEvents: 'none' }}
                    >
                        {/* Invisible hover trigger zone — always on right edge */}
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                right: 0,
                                width: '24px',
                                pointerEvents: 'auto',
                                zIndex: 2,
                            }}
                            onMouseEnter={() => setHoveredSummaryChapterId(currentChapterId)}
                            onMouseLeave={() => !aiPanelExpanded && setHoveredSummaryChapterId(null)}
                            onClick={toggleSummaryPanel}
                        />

                        {/* Sliding container */}
                        <div
                            className="absolute top-0 bottom-0 right-0 flex"
                            style={{
                                width: '420px',
                                transform: aiPanelVisible ? 'translateX(0)' : 'translateX(392px)',
                                transition: 'transform 0.3s ease-in-out',
                                pointerEvents: 'auto',
                            }}
                            onMouseEnter={() => setHoveredSummaryChapterId(currentChapterId)}
                            onMouseLeave={() => !aiPanelExpanded && setHoveredSummaryChapterId(null)}
                        >
                            {/* Collapsed vertical tab */}
                            <div
                                className="flex items-center justify-center shrink-0 cursor-pointer"
                                style={{
                                    width: '28px',
                                    writingMode: 'vertical-rl',
                                    background: 'linear-gradient(180deg, #f8f8f8, #e8e8e8)',
                                    borderLeft: '1px solid #ddd',
                                    borderRight: '1px solid #eee',
                                    fontSize: '12px',
                                    color: '#666',
                                    letterSpacing: '2px',
                                    fontWeight: 600,
                                }}
                                onClick={toggleSummaryPanel}
                            >
                                {t('reader.aiSummary')}
                            </div>

                            {/* Full panel content */}
                            <div className="flex-1 bg-white shadow-2xl flex flex-col border-l border-gray-200 overflow-hidden">
                                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                                    <h3 className="font-bold">{getPanelTitle(mode)}</h3>
                                    <button
                                        onClick={() => {
                                            if (currentChapterId) {
                                                setDismissedSummaryChapterIds((prev) => ({
                                                    ...prev,
                                                    [currentChapterId]: true
                                                }));
                                            }
                                            setOpenSummaryChapterId(null);
                                            setHoveredSummaryChapterId(null);
                                        }}
                                        className="text-gray-500 hover:text-gray-800 text-xl"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="p-4 flex-1 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
                                    {isProcessing && !liveSummary && (
                                        <div className="flex items-center space-x-2 text-gray-500">
                                            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                            <span>Connecting to AI...</span>
                                        </div>
                                    )}
                                    {panelSummary}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
        </div>
    );
};
