import { useRef, useEffect, useMemo, useCallback } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { LLMClient } from '../../core/llm/LLMClient';
import DOMPurify from 'dompurify';
import { useLocale } from '../../i18n';

interface ViewerProps {
    html: string;
    onNavigate: (href: string) => void;
    translations?: Map<number, string>;
}

export const Viewer: React.FC<ViewerProps> = ({ html, onNavigate, translations }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const { theme, fontSize, llm } = useSettingsStore();
    const { t } = useLocale();

    const strippedHtml = useMemo(() => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        doc.querySelectorAll('script, noscript, iframe, object, embed, meta[http-equiv="refresh"]').forEach((node) => {
            node.remove();
        });

        doc.querySelectorAll('*').forEach((element) => {
            for (const attribute of Array.from(element.attributes)) {
                const name = attribute.name.toLowerCase();
                const value = attribute.value.trim().toLowerCase();

                if (name.startsWith('on')) {
                    element.removeAttribute(attribute.name);
                    continue;
                }

                if ((name === 'href' || name === 'src' || name === 'xlink:href') && value.startsWith('javascript:')) {
                    element.removeAttribute(attribute.name);
                }
            }
        });

        return doc.body?.innerHTML || doc.documentElement?.innerHTML || html;
    }, [html]);

    const sanitizedHtml = useMemo(() => DOMPurify.sanitize(strippedHtml, {
        ADD_TAGS: ['img', 'svg', 'image'],
        ADD_ATTR: ['src', 'href', 'target', 'xlink:href'],
        FORBID_TAGS: ['script', 'noscript', 'iframe', 'object', 'embed'],
        FORBID_ATTR: [
            'onabort', 'onanimationend', 'onanimationiteration', 'onanimationstart',
            'onauxclick', 'onbeforeinput', 'onbeforematch', 'onbeforetoggle', 'onblur',
            'oncancel', 'oncanplay', 'oncanplaythrough', 'onchange', 'onclick',
            'onclose', 'oncontextlost', 'oncontextmenu', 'oncontextrestored',
            'oncopy', 'oncuechange', 'oncut', 'ondblclick', 'ondrag', 'ondragend',
            'ondragenter', 'ondragleave', 'ondragover', 'ondragstart', 'ondrop',
            'ondurationchange', 'onemptied', 'onended', 'onerror', 'onfocus',
            'onformdata', 'oninput', 'oninvalid', 'onkeydown', 'onkeypress',
            'onkeyup', 'onload', 'onloadeddata', 'onloadedmetadata', 'onloadstart',
            'onmousedown', 'onmouseenter', 'onmouseleave', 'onmousemove', 'onmouseout',
            'onmouseover', 'onmouseup', 'onpaste', 'onpause', 'onplay', 'onplaying',
            'onpointerdown', 'onpointerenter', 'onpointerleave', 'onpointermove',
            'onpointerout', 'onpointerover', 'onpointerup', 'onprogress', 'onratechange',
            'onreset', 'onresize', 'onscroll', 'onscrollend', 'onseeked', 'onseeking',
            'onselect', 'onslotchange', 'onstalled', 'onsubmit', 'onsuspend',
            'ontimeupdate', 'ontoggle', 'ontransitionend', 'onvolumechange', 'onwaiting',
            'onwheel'
        ],
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|xxx|blob|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    }), [strippedHtml]);

    const economistStyle = `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Source+Serif+Pro:ital,wght@0,400;0,600;1,400&display=swap');

        .reader-content {
            position: relative;
            min-height: 100vh;
            font-family: 'Source Serif Pro', Georgia, 'Times New Roman', serif;
            font-size: 18px;
            line-height: 1.75;
            color: #1a1a1a;
            background-color: #fdfbf7;
            margin: 0;
            padding: 40px 60px 80px;
        }

        .reader-content * { box-sizing: border-box; }

        .reader-content h1, .reader-content h2, .reader-content h3, .reader-content h4, .reader-content h5, .reader-content h6 {
            font-family: 'Playfair Display', Georgia, serif;
            font-weight: 700;
            color: #0d0d0d;
            margin-top: 2em;
            margin-bottom: 0.5em;
            line-height: 1.3;
        }

        .reader-content h1 {
            font-size: 2.5em;
            border-bottom: 3px solid #e32636;
            padding-bottom: 0.3em;
            margin-bottom: 0.8em;
        }

        .reader-content h2 { font-size: 1.75em; color: #333; }
        .reader-content h3 { font-size: 1.4em; color: #444; }

        .reader-content p {
            margin: 0 0 1.5em;
            text-align: justify;
            hyphens: auto;
        }

        .reader-content h1 + p:first-letter,
        .reader-content h2 + p:first-letter {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 3.5em;
            float: left;
            line-height: 0.8;
            padding-right: 8px;
            padding-top: 4px;
            color: #e32636;
            font-weight: 700;
        }

        .reader-content a {
            color: #e32636;
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-color 0.2s ease;
        }

        .reader-content a:hover { border-bottom-color: #e32636; }

        .reader-content blockquote {
            margin: 2em 0;
            padding: 1em 1.5em;
            border-left: 4px solid #e32636;
            background: rgba(227, 38, 54, 0.05);
            font-style: italic;
            color: #333;
        }

        .reader-content blockquote p:last-child { margin-bottom: 0; }

        .reader-content img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 2em auto;
            border-radius: 4px;
        }

        .reader-content figure { margin: 2em 0; }

        .reader-content figcaption {
            font-size: 0.9em;
            color: #666;
            text-align: center;
            margin-top: 0.5em;
            font-style: italic;
        }

        .reader-content ul, .reader-content ol { margin: 1.5em 0; padding-left: 2em; }
        .reader-content li { margin-bottom: 0.5em; }

        .reader-content hr {
            border: none;
            height: 1px;
            background: linear-gradient(to right, transparent, #ccc, transparent);
            margin: 3em 0;
        }

        .reader-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 2em 0;
            font-size: 0.95em;
        }

        .reader-content th, .reader-content td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }

        .reader-content th { font-weight: 600; background: #f5f3ef; }

        .reader-content code {
            font-family: 'Courier New', monospace;
            background: #f5f3ef;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.9em;
        }

        .reader-content ::selection { background: rgba(227, 38, 54, 0.2); }

        .bilingual-translation {
            font-size: 0.92em;
            line-height: 1.7;
            color: #3d3d3d;
            background: linear-gradient(135deg, #fef9f0 0%, #fff5e6 100%);
            border-left: 3px solid #e32636;
            padding: 10px 16px;
            margin: 4px 0 1.2em 0;
            border-radius: 0 6px 6px 0;
            font-family: 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', sans-serif;
            position: relative;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .bilingual-translation::before {
            content: '译';
            position: absolute;
            top: 8px;
            right: 10px;
            font-size: 0.7em;
            color: #e32636;
            opacity: 0.5;
            font-weight: 700;
        }

        .word-tooltip {
            position: absolute;
            z-index: 9999;
            max-width: 340px;
            min-width: 180px;
            background: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 10px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08);
            padding: 14px 16px;
            font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            animation: tooltipFadeIn 0.2s ease;
            pointer-events: auto;
        }

        .word-tooltip::before {
            content: '';
            position: absolute;
            top: -6px;
            left: 50%;
            transform: translateX(-50%) rotate(45deg);
            width: 12px;
            height: 12px;
            background: #fff;
            border-left: 1px solid #e0e0e0;
            border-top: 1px solid #e0e0e0;
        }

        @keyframes tooltipFadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .word-tooltip-content {
            white-space: pre-wrap;
            word-break: break-word;
        }
    `;

    const applyStyles = useCallback(() => {
        const content = contentRef.current;
        if (!content) return;

        content.style.fontSize = `${fontSize}%`;

        if (theme === 'dark') {
            content.style.backgroundColor = '#1a1a1a';
            content.style.color = '#e0e0e0';
        } else if (theme === 'sepia') {
            content.style.backgroundColor = '#f4ecd8';
            content.style.color = '#5b4636';
        } else {
            content.style.backgroundColor = '#fdfbf7';
            content.style.color = '#1a1a1a';
        }
    }, [fontSize, theme]);

    const removeWordTooltip = useCallback(() => {
        contentRef.current?.querySelector('.word-tooltip')?.remove();
    }, []);

    const showWordTooltip = useCallback((x: number, y: number, content: string) => {
        const container = containerRef.current;
        const contentNode = contentRef.current;
        if (!container || !contentNode) return;

        removeWordTooltip();

        const tooltip = document.createElement('div');
        tooltip.className = 'word-tooltip';

        const contentEl = document.createElement('div');
        contentEl.className = 'word-tooltip-content';
        contentEl.textContent = content;
        tooltip.appendChild(contentEl);

        const containerRect = container.getBoundingClientRect();
        const scrollLeft = container.scrollLeft;
        const scrollTop = container.scrollTop;

        tooltip.style.left = `${x - containerRect.left + scrollLeft}px`;
        tooltip.style.top = `${y - containerRect.top + scrollTop}px`;
        contentNode.appendChild(tooltip);

        const tooltipRect = tooltip.getBoundingClientRect();
        const width = tooltipRect.width;
        let left = x - containerRect.left + scrollLeft - (width / 2);

        if (left < scrollLeft + 10) left = scrollLeft + 10;
        if (left + width > scrollLeft + container.clientWidth - 10) {
            left = scrollLeft + container.clientWidth - width - 10;
        }

        tooltip.style.left = `${left}px`;

        const top = y - containerRect.top + scrollTop;
        if (top + tooltipRect.height > scrollTop + container.clientHeight - 10) {
            tooltip.style.top = `${top - tooltipRect.height - 18}px`;
        }
    }, [removeWordTooltip]);

    useEffect(() => {
        applyStyles();
    }, [applyStyles]);

    useEffect(() => {
        const contentNode = contentRef.current;
        const container = containerRef.current;
        if (!contentNode || !container) {
            return;
        }

        let selectionTimer: number | undefined;

        const handleSelectionTranslate = async (target: EventTarget | null) => {
            const targetElement = target instanceof Node ? (target.nodeType === Node.TEXT_NODE ? target.parentElement : target as Element) : null;
            if (targetElement?.closest('.word-tooltip')) {
                return;
            }

            const selection = window.getSelection();
            const text = selection?.toString().trim() || '';
            if (!selection || selection.rangeCount === 0 || !text) {
                return;
            }

            const range = selection.getRangeAt(0);
            if (!contentNode.contains(range.commonAncestorContainer)) {
                return;
            }

            const rect = range.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) {
                return;
            }

            const x = rect.left + (rect.width / 2);
            const y = rect.bottom + 8;

            showWordTooltip(x, y, t('viewer.selectionCaptured', { text }));

            try {
                const client = new LLMClient(llm);
                const isWord = text.split(/\s+/).length <= 2 && text.length < 30;
                const translation = isWord
                    ? await client.translateWord(text)
                    : await client.translateSelection(text);

                showWordTooltip(x, y, translation);
            } catch (error) {
                console.error('Translation failed:', error);
                showWordTooltip(x, y, t('viewer.translationFailedOriginal', { text }));
            }
        };

        const handleClick = (event: MouseEvent) => {
            const target = event.target instanceof Node
                ? (event.target.nodeType === Node.TEXT_NODE ? event.target.parentElement : event.target as Element)
                : null;

            if (!target) {
                return;
            }

            const link = target.closest('a');
            if (link) {
                const href = link.getAttribute('href');
                if (href && !href.startsWith('http') && !href.startsWith('javascript:')) {
                    event.preventDefault();
                    event.stopPropagation();
                    onNavigate(href);
                    return;
                }
            }

            if (target.closest('.word-tooltip')) {
                return;
            }

            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) {
                removeWordTooltip();
            }
        };

        const queueTranslate = (event: MouseEvent) => {
            if (selectionTimer) {
                window.clearTimeout(selectionTimer);
            }

            selectionTimer = window.setTimeout(() => {
                void handleSelectionTranslate(event.target);
            }, 10);
        };

        contentNode.addEventListener('click', handleClick, true);
        contentNode.addEventListener('mouseup', queueTranslate);
        contentNode.addEventListener('dblclick', queueTranslate);

        return () => {
            if (selectionTimer) {
                window.clearTimeout(selectionTimer);
            }
            contentNode.removeEventListener('click', handleClick, true);
            contentNode.removeEventListener('mouseup', queueTranslate);
            contentNode.removeEventListener('dblclick', queueTranslate);
        };
    }, [llm, onNavigate, removeWordTooltip, showWordTooltip]);

    useEffect(() => {
        const contentNode = contentRef.current;
        if (!contentNode) return;

        if (!translations || translations.size === 0) {
            contentNode.querySelectorAll('.bilingual-translation').forEach((el) => el.remove());
            return;
        }

        const elements = contentNode.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
        let pIndex = 0;

        elements.forEach((el) => {
            const text = el.textContent?.trim();
            if (!text) return;

            const translation = translations.get(pIndex);
            const nextSibling = el.nextSibling as HTMLElement | null;
            const isNextTranslation = nextSibling?.classList?.contains('bilingual-translation');

            if (translation) {
                if (isNextTranslation) {
                    if (nextSibling && nextSibling.textContent !== translation) {
                        nextSibling.textContent = translation;
                    }
                } else {
                    const translationDiv = document.createElement('div');
                    translationDiv.className = 'bilingual-translation';
                    translationDiv.textContent = translation;
                    el.parentNode?.insertBefore(translationDiv, el.nextSibling);
                }
            } else if (isNextTranslation && nextSibling) {
                nextSibling.remove();
            }

            pIndex++;
        });
    }, [translations, sanitizedHtml]);

    return (
        <div ref={containerRef} className="h-screen w-full overflow-y-auto bg-[#fdfbf7]">
            <style>{economistStyle}</style>
            <div
                ref={contentRef}
                className="reader-content"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml || `<div class="p-10 text-center text-gray-500">${t('viewer.selectChapter')}</div>` }}
            />
        </div>
    );
};
