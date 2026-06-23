import followQr from '../../assets/follow-qr.png';
import { useLocale } from '../../i18n';

interface LandingPageProps {
    onStartReading: () => void;
    onOpenSettings: () => void;
}

export function LandingPage({ onStartReading, onOpenSettings }: LandingPageProps) {
    const { t } = useLocale();

    return (
        <div className="min-h-screen overflow-y-auto bg-[radial-gradient(circle_at_top,_#fff3ea,_#f6eee5_45%,_#efe4d7)] text-gray-900">
            <header className="sticky top-0 z-30 border-b border-black/5 bg-white/75 px-6 py-4 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between">
                    <h1 className="font-serif text-2xl font-bold tracking-tight text-[#8f1d14]">
                        The Epub AI Assistant
                    </h1>
                    <button
                        onClick={onOpenSettings}
                        className="rounded-full border border-[#8f1d14]/15 px-4 py-2 text-sm font-medium text-[#8f1d14] hover:bg-[#8f1d14]/5"
                    >
                        {t('landing.settings')}
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-6 py-16">
                <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                    <div>
                        <p className="mb-4 inline-flex rounded-full border border-[#8f1d14]/10 bg-white/70 px-4 py-2 text-sm text-[#8f1d14] shadow-sm">
                            {t('landing.badge')}
                        </p>
                        <h2 className="max-w-3xl font-serif text-5xl font-bold leading-tight text-[#2d241f]">
                            {t('landing.title')}
                        </h2>
                        <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                            {t('landing.subtitle2')}
                        </p>

                        <div className="mt-10 flex flex-wrap gap-4">
                            <button
                                onClick={onStartReading}
                                className="rounded-xl bg-[#8f1d14] px-6 py-3 text-base font-semibold text-white shadow-lg shadow-[#8f1d14]/20 transition hover:-translate-y-0.5 hover:bg-[#7f180f]"
                            >
                                {t('landing.openLibrary')}
                            </button>
                            <button
                                onClick={onOpenSettings}
                                className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-800 transition hover:border-[#8f1d14] hover:text-[#8f1d14]"
                            >
                                {t('landing.configFirst')}
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        <div className="rounded-3xl bg-[#201a17] p-6 text-white shadow-2xl">
                            <div className="mb-4 text-xs uppercase tracking-[0.24em] text-[#f1c9ae]">
                                {t('landing.workflow')}
                            </div>
                            <div className="space-y-4">
                                <div className="rounded-2xl bg-white/8 p-4">
                                    <div className="text-sm text-white/60">01</div>
                                    <div className="mt-1 text-lg font-semibold">{t('landing.workflow.import.title')}</div>
                                    <div className="mt-2 text-sm text-white/70">{t('landing.workflow.import.desc')}</div>
                                </div>
                                <div className="rounded-2xl bg-white/8 p-4">
                                    <div className="text-sm text-white/60">02</div>
                                    <div className="mt-1 text-lg font-semibold">{t('landing.workflow.config.title')}</div>
                                    <div className="mt-2 text-sm text-white/70">{t('landing.workflow.config.desc')}</div>
                                </div>
                                <div className="rounded-2xl bg-white/8 p-4">
                                    <div className="text-sm text-white/60">03</div>
                                    <div className="mt-1 text-lg font-semibold">{t('landing.workflow.read.title')}</div>
                                    <div className="mt-2 text-sm text-white/70">{t('landing.workflow.read.desc')}</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm">
                                <div className="text-sm text-gray-500">{t('landing.card.storage.label')}</div>
                                <div className="mt-2 text-2xl font-bold text-[#2d241f]">{t('landing.card.storage.value')}</div>
                            </div>
                            <div className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm">
                                <div className="text-sm text-gray-500">{t('landing.card.account.label')}</div>
                                <div className="mt-2 text-2xl font-bold text-[#2d241f]">{t('landing.card.account.value')}</div>
                            </div>
                            <div className="rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm">
                                <div className="text-sm text-gray-500">{t('landing.card.model.label')}</div>
                                <div className="mt-2 text-2xl font-bold text-[#2d241f]">{t('landing.card.model.value')}</div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-16">
                    <div className="overflow-hidden rounded-[2rem] border border-black/5 bg-white/80 shadow-xl shadow-black/5 backdrop-blur">
                        <div className="grid gap-8 px-8 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                            <div>
                                <p className="mb-3 inline-flex rounded-full border border-[#8f1d14]/10 bg-[#fff7f2] px-4 py-2 text-xs font-semibold tracking-[0.18em] text-[#8f1d14]">
                                    {t('landing.follow.badge')}
                                </p>
                                <h3 className="font-serif text-3xl font-bold leading-tight text-[#2d241f]">
                                    {t('landing.follow.title')}
                                </h3>
                                <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
                                    {t('landing.follow.desc')}
                                </p>
                            </div>

                            <div className="flex justify-center lg:justify-end">
                                <div className="rounded-[1.75rem] bg-[#fffaf5] p-5 shadow-lg shadow-black/5 ring-1 ring-black/5">
                                    <img
                                        src={followQr}
                                        alt={t('landing.follow.imageAlt')}
                                        className="h-56 w-56 rounded-2xl bg-white object-contain"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
