import { useState } from 'react';
import { X, Check } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { COLUMN_COLORS } from '../../types/kanban';

interface ColumnSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    column: {
        id: string;
        name: string;
        wip_limit?: number | null;
        color?: string;
    };
    onUpdate: (data: { name: string; wip_limit?: number | null; color?: string }) => void;
    isUpdating?: boolean;
}

export function ColumnSettingsModal({
    isOpen,
    onClose,
    column,
    onUpdate,
    isUpdating
}: ColumnSettingsModalProps) {
    const { t } = useTranslation();
    const [drafts, setDrafts] = useState<Record<string, { name: string; wipLimit: string; color: string }>>({});

    const defaultName = column.name;
    const defaultWipLimit = column.wip_limit?.toString() || '';
    const defaultColor = column.color || COLUMN_COLORS.todo;
    const currentDraft = drafts[column.id];

    const name = currentDraft?.name ?? defaultName;
    const wipLimit = currentDraft?.wipLimit ?? defaultWipLimit;
    const color = currentDraft?.color ?? defaultColor;

    const updateCurrentDraft = (partial: Partial<{ name: string; wipLimit: string; color: string }>) => {
        setDrafts((prev) => {
            const existing = prev[column.id] ?? {
                name: defaultName,
                wipLimit: defaultWipLimit,
                color: defaultColor,
            };
            return {
                ...prev,
                [column.id]: { ...existing, ...partial },
            };
        });
    };

    const clearCurrentDraft = () => {
        setDrafts((prev) => {
            if (!prev[column.id]) return prev;
            const next = { ...prev };
            delete next[column.id];
            return next;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const parsedLimit = wipLimit.trim() === '' ? null : parseInt(wipLimit, 10);
        onUpdate({
            name: name.trim(),
            wip_limit: parsedLimit === null || Number.isNaN(parsedLimit) ? null : parsedLimit,
            color: color
        });
        clearCurrentDraft();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
            {/* Modal Card */}
            <div className="relative w-full max-w-[450px] max-h-[90dvh] flex flex-col rounded-xl border border-border bg-surface/95 backdrop-blur-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <h2 className="text-text text-lg font-bold tracking-tight">{t('board.settings.title')}</h2>
                    <button
                        onClick={() => {
                            clearCurrentDraft();
                            onClose();
                        }}
                        className="text-text-muted hover:text-text transition-colors p-2 rounded-full hover:bg-white/5"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex flex-col gap-5 overflow-y-auto mobile-scroll">
                    {/* Name */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                            {t('board.settings.name_label')}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => updateCurrentDraft({ name: e.target.value })}
                            className="w-full bg-white/5 border border-border rounded-lg px-4 py-2 text-text focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                            autoFocus
                        />
                    </div>

                    {/* WIP Limit */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                            {t('board.settings.wip_limit_label')}
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={wipLimit}
                            onChange={(e) => updateCurrentDraft({ wipLimit: e.target.value })}
                            placeholder={t('board.settings.wip_limit_placeholder')}
                            className="w-full bg-white/5 border border-border rounded-lg px-4 py-2 text-text focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        />
                        <p className="text-[10px] text-text-muted italic">
                            {t('board.settings.wip_limit_desc')}
                        </p>
                    </div>

                    {/* Color Picker */}
                    <div className="flex flex-col gap-3">
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                            {t('board.settings.color_label')}
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {Object.values(COLUMN_COLORS).map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => updateCurrentDraft({ color: c })}
                                    className={`size-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${color === c ? 'border-primary ring-2 ring-primary/20' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                >
                                    {color === c && <Check className="size-4 text-white" weight="bold" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                        <button
                            type="button"
                            onClick={() => {
                                clearCurrentDraft();
                                onClose();
                            }}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-text hover:bg-white/5 transition-all"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isUpdating || !name.trim()}
                            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUpdating ? t('common.saving') : t('common.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
