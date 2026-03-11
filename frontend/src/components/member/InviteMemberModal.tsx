import { useMemo, useState } from 'react';
import { X, CircleNotch as Loader2, EnvelopeSimple as Mail, UserPlus, Check } from '@phosphor-icons/react';
import { useAddMember, useProjects } from '../../hooks/useKanbanData';
import { useTranslation } from 'react-i18next';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId?: string;
    projectName?: string;
}

interface ProjectOption {
    id: string;
    name: string;
}

export function InviteMemberModal({ isOpen, onClose, projectId, projectName }: InviteMemberModalProps) {
    const { t } = useTranslation();

    const ROLE_OPTIONS = [
        { value: 'member', label: t('members.roles.member', 'Member'), description: t('members.modal.roles.member_desc') },
        { value: 'admin', label: t('members.roles.admin', 'Admin'), description: t('members.modal.roles.admin_desc') },
        { value: 'viewer', label: t('members.roles.viewer', 'Viewer'), description: t('members.modal.roles.viewer_desc') },
    ] as const;

    const [email, setEmail] = useState('');
    const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]['value']>('member');
    const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const { data: projectsData } = useProjects();
    const projects = useMemo<ProjectOption[]>(
        () => (projectsData?.projects ?? []) as ProjectOption[],
        [projectsData?.projects]
    );
    const resolvedProjectId = projectId || selectedProjectId || projects[0]?.id || '';

    const addMember = useAddMember(resolvedProjectId);
    const selectedProject = useMemo(
        () => projects.find((project) => project.id === resolvedProjectId),
        [projects, resolvedProjectId]
    );

    const resetForm = () => {
        setEmail('');
        setRole('member');
        setError('');
        setIsSuccess(false);
        setSelectedProjectId(projectId || projects[0]?.id || '');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        if (!email.trim() || !resolvedProjectId) {
            setError(t('members.modal.error_required'));
            return;
        }

        try {
            await addMember.mutateAsync({ email: email.trim(), role });
            setIsSuccess(true);
            setTimeout(() => {
                handleClose();
            }, 1200);
        } catch (requestError) {
            const message = requestError instanceof Error ? requestError.message : t('members.modal.error_failed');
            setError(message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-[480px] max-h-[92dvh] flex flex-col rounded-xl border border-border bg-surface shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 sm:px-6 pt-5 sm:pt-6 pb-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <UserPlus className="size-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-text text-xl font-bold tracking-tight">{t('members.modal.title')}</h2>
                            <p className="text-text-muted text-sm">
                                {projectName || selectedProject?.name
                                    ? t('members.modal.subtitle', { name: projectName || selectedProject?.name })
                                    : t('members.modal.subtitle_fallback')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-text-muted hover:text-text transition-colors p-2 rounded-full hover:bg-surface-alt"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {isSuccess ? (
                    <div className="p-6 flex flex-col items-center justify-center py-12">
                        <div className="size-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                            <Check className="size-8 text-green-500" />
                        </div>
                        <h3 className="text-text text-lg font-semibold mb-2">{t('members.modal.success_title')}</h3>
                        <p className="text-text-muted text-center">
                            {t('members.modal.success_desc', { email })}
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto mobile-scroll">
                        {!projectId && (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-text">{t('members.modal.project_label')}</label>
                                <select
                                    value={resolvedProjectId}
                                    onChange={(event) => setSelectedProjectId(event.target.value)}
                                    className="glass-input w-full rounded-lg h-11 px-3"
                                >
                                    {projects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-text">
                                {t('members.modal.email_label')} <span className="text-primary">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="size-5 text-text-muted" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    className="glass-input w-full h-12 pl-12 pr-4 rounded-lg"
                                    placeholder={t('members.modal.email_placeholder')}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-text">{t('members.modal.role_label')}</label>
                            <div className="space-y-2">
                                {ROLE_OPTIONS.map((option) => (
                                    <label
                                        key={option.value}
                                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${role === option.value
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:bg-surface-alt'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="role"
                                            value={option.value}
                                            checked={role === option.value}
                                            onChange={(event) => setRole(event.target.value as (typeof ROLE_OPTIONS)[number]['value'])}
                                            className="mt-1 text-primary"
                                        />
                                        <div>
                                            <p className="text-text font-medium text-sm">{option.label}</p>
                                            <p className="text-text-muted text-xs">{option.description}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {error ? <p className="text-sm text-red-400">{error}</p> : null}

                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-5 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:text-text hover:bg-surface-alt"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={addMember.isPending || !email.trim() || !resolvedProjectId}
                                className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {addMember.isPending && <Loader2 className="size-4 animate-spin" />}
                                {t('members.modal.send_btn')}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

