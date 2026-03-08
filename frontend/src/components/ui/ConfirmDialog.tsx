import { Warning } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText,
    cancelText,
    isDanger = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const { t } = useTranslation();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
            <div
                className="relative w-full max-w-sm flex flex-col rounded-xl border border-border bg-surface/95 backdrop-blur-md shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] ring-1 ring-border-muted overflow-hidden animate-in fade-in zoom-in duration-200"
            >
                <div className="flex items-start gap-4 p-6">
                    <div className={`p-2 rounded-full ${isDanger ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                        <Warning weight="fill" className="size-6" />
                    </div>
                    <div className="flex-1 pt-1">
                        <h3 className="text-text font-semibold text-lg leading-none tracking-tight mb-2">
                            {title}
                        </h3>
                        <p className="text-sm text-text-muted leading-relaxed">
                            {message}
                        </p>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-3 px-6 py-4 bg-surface-alt border-t border-border-muted">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text bg-transparent hover:bg-surface rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        {cancelText || t('common.cancel')}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm font-medium text-text rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface ${isDanger
                            ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500 shadow-lg shadow-red-500/20'
                            : 'bg-primary hover:bg-primary/90 focus:ring-primary shadow-lg shadow-primary/20'
                            }`}
                    >
                        {confirmText || t('common.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
}
