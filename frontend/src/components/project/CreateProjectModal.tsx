import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useCreateProject } from '../../hooks/useKanbanData';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PROJECT_COLORS = [
    { name: 'teal', value: '#14b8a6', class: 'bg-teal-500' },
    { name: 'blue', value: '#3b82f6', class: 'bg-blue-500' },
    { name: 'purple', value: '#8b5cf6', class: 'bg-purple-500' },
    { name: 'pink', value: '#ec4899', class: 'bg-pink-500' },
    { name: 'red', value: '#ef4444', class: 'bg-red-500' },
    { name: 'orange', value: '#f97316', class: 'bg-orange-500' },
    { name: 'yellow', value: '#eab308', class: 'bg-yellow-500' },
    { name: 'green', value: '#22c55e', class: 'bg-green-500' },
];

const TEMPLATES = [
    { value: 'blank', labelKey: 'projects.templates.blank' },
    { value: 'software', labelKey: 'projects.templates.software' },
    { value: 'marketing', labelKey: 'projects.templates.marketing' },
    { value: 'personal', labelKey: 'projects.templates.personal' },
];

export function CreateProjectModal({ isOpen, onClose, onProjectCreated }: CreateProjectModalProps & { onProjectCreated?: () => void }) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0].value);
    const [template, setTemplate] = useState('blank');

    const createProject = useCreateProject();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        createProject.mutate(
            { name: name.trim(), description: description.trim() || undefined },
            {
                onSuccess: () => {
                    setName('');
                    setDescription('');
                    setSelectedColor(PROJECT_COLORS[0].value);
                    setTemplate('blank');
                    onClose();
                    if (onProjectCreated) onProjectCreated();
                },
            }
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all duration-300">
            {/* Modal Card */}
            <div className="relative w-full max-w-[480px] max-h-[92dvh] flex flex-col rounded-xl border border-border bg-surface/95 backdrop-blur-md shadow-[0_0_40px_-10px_rgba(19,185,165,0.15)] ring-1 ring-border-muted overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 pt-5 sm:pt-6 pb-2">
                    <h2 className="text-text text-xl font-bold tracking-tight">{t('projects.create_new')}</h2>
                    <button
                        onClick={onClose}
                        className="group text-text-muted hover:text-text transition-colors p-2 rounded-full hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <X className="size-6" />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 overflow-y-auto mobile-scroll">
                    {/* Project Name */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-text-muted">
                            {t('projects.name')} <span className="text-primary">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="glass-input w-full h-12 px-4 rounded-lg text-text"
                            placeholder={t('projects.placeholder')}
                            required
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-text-muted">{t('projects.description')}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="glass-input w-full min-h-[84px] p-4 rounded-lg resize-none text-text"
                            placeholder={t('projects.description_placeholder')}
                            rows={3}
                        />
                    </div>

                    {/* Color Picker */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-text-muted">{t('projects.color')}</label>
                        <div className="flex flex-wrap gap-3">
                            {PROJECT_COLORS.map((color) => (
                                <label key={color.name} className="relative size-8 rounded-full cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="project_color"
                                        value={color.value}
                                        checked={selectedColor === color.value}
                                        onChange={() => setSelectedColor(color.value)}
                                        className="peer sr-only"
                                    />
                                    <span
                                        className={`absolute inset-0 rounded-full ${color.class} ring-2 ring-transparent peer-checked:ring-offset-2 peer-checked:ring-offset-surface peer-checked:ring-primary transition-all duration-200 shadow-sm`}
                                    />
                                    <span className="absolute inset-0 flex items-center justify-center text-text text-base opacity-0 peer-checked:opacity-100 scale-50 peer-checked:scale-100 transition-all duration-200">
                                        ✓
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Template Dropdown */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-text-muted">{t('projects.template')}</label>
                        <div className="relative">
                            <select
                                value={template}
                                onChange={(e) => setTemplate(e.target.value)}
                                className="glass-input w-full h-12 pl-4 pr-10 rounded-lg appearance-none cursor-pointer text-text"
                            >
                                {TEMPLATES.map((tmpl) => (
                                    <option key={tmpl.value} value={tmpl.value} className="bg-surface text-text">
                                        {t(tmpl.labelKey)}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-muted">
                                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-border-muted bg-surface-alt/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:text-text hover:bg-surface transition-all focus:outline-none"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!name.trim() || createProject.isPending}
                        className="btn-primary px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                    >
                        {createProject.isPending ? t('common.creating') : t('projects.create_new')}
                    </button>
                </div>
            </div>
        </div>
    );
}
