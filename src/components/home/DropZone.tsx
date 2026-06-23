import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { EpubParser } from '../../core/parser/EpubParser';
import { useReaderStore } from '../../store/useReaderStore';
import { bookDatabase } from '../../core/db/BookDatabase';
import { useLocale } from '../../i18n';

export const DropZone: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
    const { setBook, setLoading, isLoading, loadLibrary } = useReaderStore();
    const [error, setError] = useState<string | null>(null);
    const [urlInput, setUrlInput] = useState('');
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
    const { t } = useLocale();
    const chromeRuntime = (globalThis as typeof globalThis & {
        chrome?: { runtime?: { id?: string } };
    }).chrome?.runtime;
    const isExtensionContext = Boolean(chromeRuntime?.id);

    // Convert GitHub blob URLs to raw URLs
    const normalizeGithubUrl = (url: string): string => {
        const githubBlobMatch = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
        if (githubBlobMatch) {
            const [, user, repo, pathWithBranch] = githubBlobMatch;
            return `https://raw.githubusercontent.com/${user}/${repo}/${pathWithBranch}`;
        }
        return url;
    };

    const parseEpub = async (data: File | ArrayBuffer) => {
        setLoading(true);
        setError(null);

        try {
            const parser = new EpubParser();
            const book = await parser.parse(data);

            // Save to database
            let arrayBuffer: ArrayBuffer;
            if (data instanceof File) {
                arrayBuffer = await data.arrayBuffer();
            } else {
                arrayBuffer = data;
            }

            await bookDatabase.addBook(
                book.metadata.title || 'Untitled',
                book.metadata.author || 'Unknown Author',
                book.metadata.publisher,
                book.metadata.pubDate,
                book.metadata.subject,
                book.metadata.coverUrl || null,
                book.metadata.coverBlob || null,
                arrayBuffer
            );

            // Reload library to update UI
            await loadLibrary();

            setBook(book, parser);
            if (onSuccess) onSuccess();
        } catch (err: unknown) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Failed to parse EPUB');
        } finally {
            setLoading(false);
        }
    };

    const onDrop = async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;
        await parseEpub(acceptedFiles[0]);
    };

    const handleUrlLoad = async () => {
        if (!urlInput.trim()) {
            setError(t('dropzone.invalidUrl'));
            return;
        }

        setLoading(true);
        setError(null);
        setDownloadProgress(0);

        try {
            const normalizedUrl = normalizeGithubUrl(urlInput.trim());
            console.log('[DropZone] Fetching:', normalizedUrl);

            let response: Response;
            try {
                response = await fetch(normalizedUrl);
            } catch (directError) {
                if (isExtensionContext) {
                    throw directError;
                }

                const proxyUrl = `/api/epub?url=${encodeURIComponent(normalizedUrl)}`;
                response = await fetch(proxyUrl);
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch: ${response.status}`);
            }

            // Get content length for progress tracking
            const contentLength = response.headers.get('content-length');
            const total = contentLength ? parseInt(contentLength, 10) : 0;

            if (total && response.body) {
                // Stream response with progress
                const reader = response.body.getReader();
                const chunks: Uint8Array[] = [];
                let received = 0;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    chunks.push(value);
                    received += value.length;

                    const progress = Math.round((received / total) * 100);
                    setDownloadProgress(progress);
                }

                // Combine chunks into ArrayBuffer
                const arrayBuffer = new Uint8Array(received);
                let position = 0;
                for (const chunk of chunks) {
                    arrayBuffer.set(chunk, position);
                    position += chunk.length;
                }

                setDownloadProgress(100);
                await parseEpub(arrayBuffer.buffer);
            } else {
                // Fallback: no content-length header
                setDownloadProgress(null);
                const arrayBuffer = await response.arrayBuffer();
                await parseEpub(arrayBuffer);
            }
        } catch (err: unknown) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Failed to load EPUB from URL');
            setLoading(false);
        } finally {
            setDownloadProgress(null);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/epub+zip': ['.epub']
        },
        maxFiles: 1,
        disabled: isLoading
    });

    return (
        <div className="space-y-6">
            {/* Drag & Drop Zone */}
            <div
                {...getRootProps()}
                className={`
                    flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg p-6
                    ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    transition-colors
                `}
            >
                <input {...getInputProps()} />
                {isLoading ? (
                    <div className="flex flex-col items-center space-y-3 text-gray-500">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        {downloadProgress !== null ? (
                            <>
                                <span>{t('dropzone.downloading', { progress: String(downloadProgress) })}</span>
                                <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-200"
                                        style={{ width: `${downloadProgress}%` }}
                                    />
                                </div>
                            </>
                        ) : (
                            <span>{t('dropzone.loadingEpub')}</span>
                        )}
                    </div>
                ) : isDragActive ? (
                    <p className="text-blue-500 font-medium">{t('dropzone.dropHere')}</p>
                ) : (
                    <div className="text-center text-gray-500">
                        <p className="mb-2 text-lg">{t('dropzone.dragDrop')}</p>
                        <p className="text-sm">{t('dropzone.clickSelect')}</p>
                    </div>
                )}
            </div>

            {/* URL Input */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-gray-500">{t('dropzone.orLoadUrl')}</span>
                </div>
            </div>

            <div className="flex space-x-2">
                <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder={t('dropzone.urlPlaceholder')}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleUrlLoad();
                        }
                    }}
                />
                <button
                    onClick={handleUrlLoad}
                    disabled={isLoading || !urlInput.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading && downloadProgress !== null ? `${downloadProgress}%` : t('dropzone.load')}
                </button>
            </div>

            {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
            )}
        </div>
    );
};
