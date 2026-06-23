import React from 'react';
import { DropZone } from './DropZone';
import { useLocale } from '../../i18n';

interface ImportModalProps {
    onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onClose }) => {
    const { t } = useLocale();
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden relative">
                {/* Header */}
                <div className="bg-[#E3120B] text-white p-4 flex justify-between items-center font-serif">
                    <h2 className="text-xl font-bold">{t('import.title')}</h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200 text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <DropZone onSuccess={onClose} />
                </div>
            </div>
        </div>
    );
};
