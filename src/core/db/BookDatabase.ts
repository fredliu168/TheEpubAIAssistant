export interface BookMeta {
    id: string;
    title: string;
    author: string;
    publisher?: string;
    pubDate?: string;
    subject?: string;
    coverUrl: string | null;
    addedAt: number;
}

interface StoredBookRecord {
    id: string;
    title: string;
    author: string;
    publisher?: string;
    pubDate?: string;
    subject?: string;
    coverBlob: Blob | null;
    fileData: ArrayBuffer;
    addedAt: number;
    contentHash: string;
}

interface StoredBook extends BookMeta {
    fileData: Uint8Array;
}

function uuidv4() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const DB_NAME = 'epub_library';
const DB_VERSION = 1;
const BOOK_STORE = 'books';

class BookDatabase {
    private dbPromise: Promise<IDBDatabase> | null = null;

    private open(): Promise<IDBDatabase> {
        if (this.dbPromise) {
            return this.dbPromise;
        }

        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(BOOK_STORE)) {
                    const store = db.createObjectStore(BOOK_STORE, { keyPath: 'id' });
                    store.createIndex('addedAt', 'addedAt', { unique: false });
                    store.createIndex('contentHash', 'contentHash', { unique: true });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
        });

        return this.dbPromise;
    }

    private async getStore(mode: IDBTransactionMode) {
        const db = await this.open();
        return db.transaction(BOOK_STORE, mode).objectStore(BOOK_STORE);
    }

    private requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
        });
    }

    private async computeHash(fileData: ArrayBuffer): Promise<string> {
        const hashBuffer = await crypto.subtle.digest('SHA-256', fileData);
        return Array.from(new Uint8Array(hashBuffer))
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('');
    }

    private toMeta(record: StoredBookRecord): BookMeta {
        return {
            id: record.id,
            title: record.title,
            author: record.author,
            publisher: record.publisher,
            pubDate: record.pubDate,
            subject: record.subject,
            coverUrl: record.coverBlob ? URL.createObjectURL(record.coverBlob) : null,
            addedAt: record.addedAt,
        };
    }

    async addBook(
        title: string,
        author: string,
        publisher: string | undefined,
        pubDate: string | undefined,
        subject: string | undefined,
        _coverUrl: string | null,
        coverBlob: Blob | null,
        fileData: ArrayBuffer
    ): Promise<BookMeta> {
        const contentHash = await this.computeHash(fileData);
        const store = await this.getStore('readwrite');
        const index = store.index('contentHash');
        const existing = await this.requestToPromise(index.get(contentHash));

        if (existing) {
            throw new Error('Duplicate book: This book already exists in the library.');
        }

        const record: StoredBookRecord = {
            id: uuidv4(),
            title,
            author: author || 'Unknown',
            publisher,
            pubDate,
            subject,
            coverBlob,
            fileData,
            addedAt: Date.now(),
            contentHash,
        };

        await this.requestToPromise(store.put(record));
        return this.toMeta(record);
    }

    async getBooks(): Promise<BookMeta[]> {
        const store = await this.getStore('readonly');
        const records = await this.requestToPromise(store.getAll()) as StoredBookRecord[];

        return records
            .sort((a, b) => b.addedAt - a.addedAt)
            .map((record) => this.toMeta(record));
    }

    async getBookData(id: string): Promise<StoredBook | null> {
        const store = await this.getStore('readonly');
        const record = await this.requestToPromise(store.get(id)) as StoredBookRecord | undefined;

        if (!record) {
            return null;
        }

        return {
            id: record.id,
            title: record.title,
            author: record.author,
            publisher: record.publisher,
            pubDate: record.pubDate,
            subject: record.subject,
            coverUrl: record.coverBlob ? URL.createObjectURL(record.coverBlob) : null,
            fileData: new Uint8Array(record.fileData),
            addedAt: record.addedAt,
        };
    }

    async deleteBook(id: string): Promise<void> {
        const store = await this.getStore('readwrite');
        await this.requestToPromise(store.delete(id));
    }

    async loginUser(phone: string): Promise<{ id: string; phone: string }> {
        return {
            id: uuidv4(),
            phone,
        };
    }
}

export const bookDatabase = new BookDatabase();
