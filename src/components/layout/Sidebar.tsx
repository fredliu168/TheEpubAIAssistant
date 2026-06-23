import React, { useState } from 'react';
import { useReaderStore } from '../../store/useReaderStore';
import type { TOCItem } from '../../types';
import { useLocale } from '../../i18n';

interface SidebarProps {
    onToggle: () => void;
    isOpen: boolean;
}

interface TOCItemProps {
    item: TOCItem;
    depth: number;
    currentChapterId: string | null;
    onSelect: (href: string) => void;
}

const TOCItemComponent: React.FC<TOCItemProps> = ({ item, depth, currentChapterId, onSelect }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const itemRef = React.useRef<HTMLDivElement>(null);

    // Normalize hrefs for comparison (ignore hashes if needed, though exact match is best for now)
    // The previous logic used strict equality.
    const isActive = currentChapterId === item.href;
    const hasChildren = item.children && item.children.length > 0;

    React.useEffect(() => {
        // Auto-scroll disabled per user request
        // if (isActive && itemRef.current) {
        //    itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // }
    }, [isActive]);

    return (
        <div>
            <div
                ref={itemRef}
                className={`
                    p-2 cursor-pointer rounded text-sm flex items-center gap-1 transition-colors duration-200
                    ${isActive ? 'bg-white font-bold text-[#E3120B] shadow-sm border-l-4 border-[#E3120B]' : 'hover:bg-white text-gray-700'}
                `}
                style={{ paddingLeft: `${8 + depth * 16}px` }}
                onClick={() => {
                    // Allow clicking the row to select, even if it has children
                    // But if it has children, maybe we just expand? 
                    // Usually TOC links are clickable.
                    onSelect(item.href);
                }}
            >
                {hasChildren && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                        className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-800 flex-shrink-0"
                    >
                        {isExpanded ? '▼' : '▶'}
                    </button>
                )}
                {!hasChildren && <span className="w-4 flex-shrink-0" />}
                <span className="truncate flex-1">
                    {item.label}
                </span>
            </div>
            {hasChildren && isExpanded && (
                <div>
                    {item.children!.map((child, index) => (
                        <TOCItemComponent
                            key={child.id || index}
                            item={child}
                            depth={depth + 1}
                            currentChapterId={currentChapterId}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const Sidebar: React.FC<SidebarProps> = ({ onToggle, isOpen }) => {
    const { currentBook, setCurrentChapterId, currentChapterId } = useReaderStore();
    const { t } = useLocale();

    if (!isOpen) return null;

    return (
        <div className="w-80 h-full bg-[#f4f4f4] border-r border-gray-200 flex flex-col shadow-inner">
            <div className="p-4 border-b border-gray-200 bg-white shadow-sm z-10">
                <button onClick={onToggle} className="mb-2 text-sm text-gray-500 hover:text-[#E3120B] flex items-center gap-1 font-medium transition-colors">
                    <span>«</span> {t('sidebar.hide')}
                </button>
                <div className="flex gap-3">
                    {currentBook?.metadata.coverUrl && (
                        <img
                            src={currentBook.metadata.coverUrl}
                            alt="Book Cover"
                            className="w-16 h-24 rounded shadow-md object-cover flex-shrink-0"
                        />
                    )}
                    <div className="overflow-hidden">
                        <h2 className="font-bold text-sm text-gray-900 leading-tight mb-1 line-clamp-2">
                            {currentBook?.metadata.title || t('sidebar.toc')}
                        </h2>
                        <p className="text-xs text-gray-500 truncate">
                            {currentBook?.metadata.author}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 overscroll-contain">
                {currentBook?.toc && currentBook.toc.length > 0 ? (
                    // Use TOC with collapsible items
                    currentBook.toc.map((item, index) => (
                        <TOCItemComponent
                            key={item.id || index}
                            item={item}
                            depth={0}
                            currentChapterId={currentChapterId}
                            onSelect={setCurrentChapterId}
                        />
                    ))
                ) : (
                    // Fallback to spine
                    currentBook?.spine.map((href, index) => {
                        const isSpineActive = currentChapterId === href;
                        return (
                            <div
                                key={index}
                                ref={null}
                                onClick={() => setCurrentChapterId(href)}
                                className={`
                                    p-2 cursor-pointer rounded text-sm truncate mb-1 transition-colors
                                    ${isSpineActive ? 'bg-white font-bold text-[#E3120B] shadow-sm border-l-4 border-[#E3120B]' : 'hover:bg-white text-gray-700'}
                                `}
                            >
                                Chapter {index + 1}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
