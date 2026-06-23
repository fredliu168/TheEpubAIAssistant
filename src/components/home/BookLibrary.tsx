import React, { useState } from 'react';
import { useReaderStore } from '../../store/useReaderStore';


import { bookDatabase } from '../../core/db/BookDatabase';
import { EpubParser } from '../../core/parser/EpubParser';
import { useLocale } from '../../i18n';

import { Plus } from 'lucide-react';

interface BookLibraryProps {
    onImport?: () => void;
}

export const BookLibrary: React.FC<BookLibraryProps> = ({ onImport }) => {
    const { library, deleteBook, isLoading, loadLibrary } = useReaderStore();
    const { t } = useLocale();
    const [isDragging, setIsDragging] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const openBookInNewPage = (bookId: string) => {
        const readerUrl = new URL(window.location.href);
        readerUrl.searchParams.set('book', bookId);
        window.open(readerUrl.toString(), '_blank', 'noopener,noreferrer');
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        const file = files[0];
        if (file.type !== 'application/epub+zip' && !file.name.endsWith('.epub')) {
            alert('Please upload an EPUB file');
            return;
        }

        setIsImporting(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const parser = new EpubParser();

            // Re-create the parser for parsing to avoid state issues if any
            const parsedBook = await parser.parse(arrayBuffer);

            await bookDatabase.addBook(
                parsedBook.metadata.title || 'Untitled',
                parsedBook.metadata.author || 'Unknown Author',
                parsedBook.metadata.publisher,
                parsedBook.metadata.pubDate,
                parsedBook.metadata.subject,
                parsedBook.metadata.coverUrl || null,
                parsedBook.metadata.coverBlob || null,
                arrayBuffer
            );

            await loadLibrary();
        } catch (error) {
            console.error('Import failed:', error);
            alert('Failed to import book');
        } finally {
            setIsImporting(false);
        }
    };

    const handleDownload = async (e: React.MouseEvent, bookId: string, title: string) => {
        e.stopPropagation();
        try {
            const book = await bookDatabase.getBookData(bookId);
            if (!book || !book.fileData) {
                alert('Book data not found');
                return;
            }
            const blob = new Blob([book.fileData as any], { type: 'application/epub+zip' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title}.epub`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download book:', err);
            alert('Failed to download book');
        }
    };


    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString();
    };

    if (isLoading && library.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-4">
                {/* Add Book Button */}
                <div
                    onClick={onImport}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`group relative bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-dashed ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'} flex flex-col cursor-pointer items-center justify-center min-h-[300px]`}
                    title={t('common.import')}
                >
                    {isImporting ? (
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    ) : (
                        <>
                            <Plus className={`w-16 h-16 pointer-events-none ${isDragging ? 'text-blue-500' : 'text-gray-300 group-hover:text-gray-400'} transition-colors`} />
                            <span className={`mt-2 pointer-events-none ${isDragging ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'} font-medium font-serif`}>
                                {isDragging ? t('dropzone.dropHere') || 'Drop here' : t('common.import')}
                            </span>
                        </>
                    )}
                </div>

                {library.map((book) => (
                    <div
                        key={book.id}
                        className="group relative bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col cursor-pointer"
                        onClick={() => openBookInNewPage(book.id)}
                    >
                        {/* Cover Image */}
                        <div className="aspect-[3/4] relative overflow-hidden bg-gray-100">
                            {book.coverUrl ? (
                                <>
                                    {/* Blurred Background */}
                                    <div
                                        className="absolute inset-0 bg-cover bg-center blur-sm opacity-50 scale-110"
                                        style={{ backgroundImage: `url(${book.coverUrl})` }}
                                    />
                                    {/* Main Image */}
                                    <img
                                        src={book.coverUrl}
                                        alt={book.title}
                                        className="relative w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 shadow-sm"
                                    />
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 text-gray-400">
                                    <span className="text-4xl">📖</span>
                                </div>
                            )}

                            {/* Overlay Actions */}
                            <div className="absolute left-0 right-0 top-0 bottom-1 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transform hover:scale-110 transition-all"
                                    title={t('bookLibrary.read')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </button>
                                <button
                                    onClick={(e) => handleDownload(e, book.id, book.title)}
                                    className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transform hover:scale-110 transition-all"
                                    title={t('bookLibrary.download')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(t('bookLibrary.deleteConfirm'))) {
                                            deleteBook(book.id);
                                        }
                                    }}
                                    className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transform hover:scale-110 transition-all"
                                    title={t('bookLibrary.delete')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Book Info */}
                        <div className="p-3 flex-1 flex flex-col">
                            <h3 className="font-bold text-gray-800 line-clamp-2 mb-1 font-serif" title={book.title}>
                                {book.title}
                            </h3>
                            {book.pubDate && (
                                <p className="text-xs text-[#E3120B] font-bold mb-1 font-serif uppercase tracking-wider w-full">
                                    {book.pubDate}
                                </p>
                            )}
                            <p className="text-sm text-gray-500 line-clamp-1 mb-1 italic">
                                {book.author}
                            </p>
                            {book.subject && (
                                <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] uppercase tracking-wide font-bold mb-2 rounded border border-gray-200">
                                    {book.subject}
                                </span>
                            )}
                            <div className="mt-auto text-xs text-gray-400 border-t pt-2">
                                {t('bookLibrary.added', { date: formatDate(book.addedAt) })}
                            </div>
                        </div>
                    </div>
                ))}


            </div>
        </div>
    );
};
