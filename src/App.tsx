import { useEffect, useState } from 'react';
import { ChevronDown, Settings, Plus } from 'lucide-react';
import { useReaderStore } from './store/useReaderStore';
import { ImportModal } from './components/home/ImportModal';
import { BookLibrary } from './components/home/BookLibrary';
import { ReaderLayout } from './components/layout/ReaderLayout';
import { SettingsModal } from './components/settings/SettingsModal';
import { LandingPage } from './components/home/LandingPage';
import { useSettingsStore } from './store/useSettingsStore';
import { useLocale, SUPPORTED_LOCALES } from './i18n';

function App() {
  const { currentBook, loadLibrary, openBook, isLoading } = useReaderStore();
  const { hasSeenLanding, setHasSeenLanding } = useSettingsStore();
  const { t, locale, setLocale } = useLocale();
  const [showSettings, setShowSettings] = useState(false);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    const bookId = new URLSearchParams(window.location.search).get('book');
    if (!bookId) {
      return;
    }

    setHasSeenLanding(true);
    void openBook(bookId);
  }, [openBook, setHasSeenLanding]);

  if (!hasSeenLanding) {
    return (
      <>
        <LandingPage
          onStartReading={() => setHasSeenLanding(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </>
    );
  }

  if (currentBook) {
    return <ReaderLayout />;
  }

  const hasBookParam = new URLSearchParams(window.location.search).has('book');

  if (hasBookParam && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f3ee]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#E3120B]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3ee] text-gray-900">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-[#E3120B] px-6 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <h1
              className="cursor-pointer font-serif text-3xl font-bold tracking-tight transition-opacity hover:opacity-80"
              onClick={() => setHasSeenLanding(false)}
            >
              {t('app.title')}
            </h1>
            <p className="mt-1 text-sm text-white/80">
              {t('app.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10"
            >
              <Plus size={16} />
              {t('common.import')}
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10"
            >
              <Settings size={16} />
              {t('app.settings')}
            </button>

            <div className="relative group">
              <button className="flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">
                <span>{SUPPORTED_LOCALES.find((item) => item.code === locale)?.label}</span>
                <ChevronDown size={14} />
              </button>
              <div className="absolute right-0 top-full z-50 hidden w-32 pt-2 group-hover:block">
                <div className="rounded-md border border-gray-100 bg-white py-1 text-left text-gray-900 shadow-xl">
                  {SUPPORTED_LOCALES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLocale(lang.code)}
                      className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${locale === lang.code ? 'bg-red-50 font-bold text-[#E3120B]' : 'text-gray-700'}`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 rounded-2xl border border-black/5 bg-white px-5 py-4 shadow-sm">
          <p className="text-sm text-gray-600">
            {t('app.libraryIntro')}
          </p>
        </div>
        <BookLibrary onImport={() => setShowImport(true)} />
      </main>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;
