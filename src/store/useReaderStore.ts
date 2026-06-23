import { create } from 'zustand';
import type { Book } from '../types';
import { EpubParser } from '../core/parser/EpubParser';
import { bookDatabase, type BookMeta } from '../core/db/BookDatabase';

interface ReaderState {
    currentBook: Book | null;
    currentChapterId: string | null;
    parser: EpubParser | null;
    chapterContentCache: Record<string, string>;
    isLoading: boolean;
    library: BookMeta[];

    setBook: (book: Book, parser: EpubParser) => void;
    setCurrentChapterId: (id: string) => void;
    cacheChapter: (id: string, content: string) => void;
    setLoading: (loading: boolean) => void;

    // Library actions
    loadLibrary: () => Promise<void>;
    openBook: (id: string) => Promise<void>;
    deleteBook: (id: string) => Promise<void>;
    closeBook: () => void;
}

export const useReaderStore = create<ReaderState>((set, get) => ({
    currentBook: null,
    currentChapterId: null,
    parser: null,
    chapterContentCache: {},
    isLoading: false,
    library: [],

    setBook: (book, parser) => {
        set({
            currentBook: book,
            parser: parser,
            currentChapterId: book.spine?.[0] || null, // Default to first
            chapterContentCache: {},
            isLoading: false
        });
    },
    setCurrentChapterId: (id) => set({ currentChapterId: id }),
    cacheChapter: (id, content) => set((state) => ({
        chapterContentCache: { ...state.chapterContentCache, [id]: content }
    })),
    setLoading: (loading) => set({ isLoading: loading }),

    loadLibrary: async () => {
        try {
            const books = await bookDatabase.getBooks();
            set({ library: books });
        } catch (error) {
            console.error('Failed to load library:', error);
        }
    },

    openBook: async (id: string) => {
        set({ isLoading: true });
        try {
            const storedBook = await bookDatabase.getBookData(id);
            if (!storedBook) throw new Error('Book not found');

            const parser = new EpubParser();
            const book = await parser.parse(storedBook.fileData.buffer as ArrayBuffer);

            get().setBook(book, parser);
        } catch (error) {
            console.error('Failed to open book:', error);
            // Optionally set an error state here
        } finally {
            set({ isLoading: false });
        }
    },

    deleteBook: async (id: string) => {
        try {
            await bookDatabase.deleteBook(id);
            await get().loadLibrary();
        } catch (error) {
            console.error('Failed to delete book:', error);
        }
    },

    closeBook: () => set({
        currentBook: null,
        currentChapterId: null,
        parser: null,
        chapterContentCache: {}
    })
}));
