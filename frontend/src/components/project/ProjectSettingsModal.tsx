import { useMemo, useState } from 'react';
import { X, Trash, Check, UserPlus, Users, Gear, ShieldStar, Link } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useProject, useAddMember, useUpdateMemberRole, useRemoveMember } from '../../hooks/useKanbanData';
import { useAuthStore } from '../../stores/authStore';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ProjectIntegrationsTab } from './ProjectIntegrationsTab';

interface ProjectSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: {
        id: string;
        name: string;
        description?: string;
        isArchived?: boolean;
    };
    onUpdate: (data: { name: string; description?: string; is_archived?: boolean }) => void;
    onDelete: () => void;
    isUpdating?: boolean;
    isDeleting?: boolean;
}

type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';

interface ProjectMember {
    id?: string;
    user_id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
    role: MemberRole;
}

export function ProjectSettingsModal({
    isOpen,
    onClose,
    project,
    onUpdate,
    onDelete,
    isUpdating,
    isDeleting
}: ProjectSettingsModalProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'general' | 'members' | 'integrations'>('general');
    const [name, setName] = useState(project.name);
    const [description, setDescription] = useState(project.description || '');
    const [isArchived, setIsArchived] = useState(project.isArchived || false);

    // Member invite state
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<MemberRole>('member');
    const [inviteError, setInviteError] = useState('');

    // Confirmation states
    const [isDeleteProjectOpen, setIsDeleteProjectOpen] = useState(false);
    const [removeMemberData, setRemoveMemberData] = useState<{ isOpen: boolean, userId: string, userName: string }>({ isOpen: false, userId: '', userName: '' });

    const { user: currentUser } = useAuthStore();
    const { data: projectData, isPending: isLoadingProject } = useProject(project.id);
    const addMember = useAddMember(project.id);
    const updateRole = useUpdateMemberRole(project.id);
    const removeMember = useRemoveMember(project.id);

    const handleGeneralSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onUpdate({ name: name.trim(), description: description.trim() || undefined, is_archived: isArchived });
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteError('');
        if (!inviteEmail.trim()) return;

        try {
            await addMember.mutateAsync({ email: inviteEmail.trim(), role: inviteRole });
            setInviteEmail('');
            setInviteRole('member');
        } catch (err: unknown) {
            setInviteError(err instanceof Error ? err.message : t('projects.settings.invite_failed', 'Failed to invite member'));
        }
    };

    // Determine if current user is admin or owner
    const fullProject = projectData?.project;
    const isOwner = fullProject?.owner_id === currentUser?.id;
    const members = useMemo<ProjectMember[]>(
        () => (projectData?.members ?? []) as ProjectMember[],
        [projectData?.members]
    );
    const currentMemberRecord = members.find((m) => m.user_id === currentUser?.id);
    const isAdmin = isOwner || currentMemberRecord?.role === 'admin';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
            {/* Modal Card */}
            <div className="relative w-full max-w-[600px] flex flex-col rounded-xl border border-border bg-surface/95 backdrop-blur-md shadow-[0_0_40px_-10px_rgba(19,185,165,0.15)] ring-1 ring-white/5 overflow-hidden max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
                    <h2 className="text-text text-xl font-bold tracking-tight">{t('projects.settings.title')}</h2>
                    <button
                        onClick={onClose}
                        className="group text-text-muted hover:text-text transition-colors p-2 rounded-full hover:bg-surface-alt focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <X className="size-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-6 space-x-4 border-b border-white/5 bg-black/20">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'general'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-text-muted hover:text-text-muted hover:border-border'
                            }`}
                    >
                        <Gear className="size-4" />
                        {t('projects.settings.tabs.general')}
                    </button>
                    <button
                        onClick={() => setActiveTab('members')}
                        className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'members'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-text-muted hover:text-text-muted hover:border-border'
                            }`}
                    >
                        <Users className="size-4" />
                        {t('projects.settings.tabs.members')}
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setActiveTab('integrations')}
                            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'integrations'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-text-muted hover:text-text-muted hover:border-border'
                                }`}
                        >
                            <Link className="size-4" />
                            {t('projects.settings.tabs.integrations', 'Integrations')}
                        </button>
                    )}
                </div>

                {/* Content Area */}
                <div className="overflow-y-auto w-full custom-scrollbar">
                    {activeTab === 'general' ? (
                        <form onSubmit={handleGeneralSubmit} className="p-6 space-y-6">
                            {/* Project Name */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-text-muted">
                                    {t('projects.name')} <span className="text-primary">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="glass-input w-full h-12 px-4 rounded-lg text-text disabled:opacity-50"
                                    placeholder={t('projects.placeholder')}
                                    required
                                    disabled={!isAdmin}
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-text-muted">{t('projects.description')}</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="glass-input w-full min-h-[84px] p-4 rounded-lg resize-none text-text disabled:opacity-50"
                                    placeholder={t('projects.description_placeholder')}
                                    rows={3}
                                    disabled={!isAdmin}
                                />
                            </div>

                            {/* Archive Project */}
                            {isAdmin && (
                                <div className="space-y-2 pt-4 border-t border-white/5 mt-4">
                                    <h3 className="text-text font-medium mb-2">{t('projects.settings.status')}</h3>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={isArchived}
                                                onChange={(e) => setIsArchived(e.target.checked)}
                                            />
                                            <div className={`block w-10 h-6 rounded-full transition-colors ${isArchived ? 'bg-primary' : 'bg-surface-alt border border-border'}`}></div>
                                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isArchived ? 'translate-x-4' : ''}`}></div>
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-text">{t('projects.settings.archive_project')}</div>
                                            <div className="text-xs text-text-muted">{t('projects.settings.archive_desc')}</div>
                                        </div>
                                    </label>
                                </div>
                            )}

                            {/* Save Button */}
                            {isAdmin && (
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={!name.trim() || isUpdating}
                                        className="w-full h-12 rounded-lg bg-primary hover:bg-primary-hover text-black font-bold text-sm transition-all shadow-[0_0_15px_rgba(19,185,165,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <Check className="size-5" />
                                        {isUpdating ? t('common.saving') : t('common.save_changes')}
                                    </button>
                                </div>
                            )}

                            {/* Danger Zone */}
                            {isOwner && (
                                <div className="pt-6 border-t border-red-500/20 mt-6">
                                    <h3 className="text-red-400 font-semibold mb-2">{t('projects.settings.danger_zone')}</h3>
                                    <p className="text-sm text-text-muted mb-4">
                                        {t('projects.settings.delete_desc')}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setIsDeleteProjectOpen(true)}
                                        disabled={isDeleting}
                                        className="w-full flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Trash className="size-4" />
                                        {isDeleting ? t('common.deleting') : t('projects.settings.delete_project')}
                                    </button>
                                </div>
                            )}
                        </form>
                    ) : activeTab === 'members' ? (
                        <div className="p-6 space-y-6">
                            {/* Invite Section */}
                            {isAdmin && (
                                <div className="space-y-4">
                                    <h3 className="text-text font-medium">{t('projects.settings.invite_people')}</h3>
                                    <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2 items-start">
                                        <div className="flex-1 w-full space-y-1">
                                            <input
                                                type="email"
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value)}
                                                className="glass-input w-full h-10 px-3 rounded-lg text-text text-sm"
                                                placeholder={t('projects.settings.email_placeholder')}
                                                required
                                            />
                                            {inviteError && (
                                                <p className="text-red-400 text-xs mt-1">{inviteError}</p>
                                            )}
                                        </div>
                                        <div className="w-full sm:w-32 flex-shrink-0">
                                            <select
                                                value={inviteRole}
                                                onChange={(e) => setInviteRole(e.target.value as Exclude<MemberRole, 'owner'>)}
                                                className="glass-input w-full h-10 px-3 rounded-lg text-text text-sm appearance-none bg-surface/50 cursor-pointer focus:ring-2 focus:ring-primary"
                                                style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em' }}
                                            >
                                                <option value="member">{t('projects.settings.roles.member')}</option>
                                                <option value="admin">{t('projects.settings.roles.admin')}</option>
                                                <option value="viewer">{t('projects.settings.roles.viewer')}</option>
                                            </select>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={!inviteEmail.trim() || addMember.isPending}
                                            className="w-full sm:w-auto h-10 px-4 rounded-lg bg-primary hover:bg-primary-hover text-black font-semibold text-sm transition-all shadow-[0_0_15px_rgba(19,185,165,0.3)] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-2 flex-shrink-0"
                                        >
                                            <UserPlus className="size-4" />
                                            {t('projects.settings.invite_button')}
                                        </button>
                                    </form>
                                    <div className="border-b border-white/5 pt-4"></div>
                                </div>
                            )}

                            {/* Members List */}
                            <div className="space-y-4">
                                <h3 className="text-text font-medium">{t('projects.settings.project_members')}</h3>
                                {isLoadingProject ? (
                                    <div className="animate-pulse space-y-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-12 bg-surface-alt rounded-lg w-full"></div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {members.map((member) => (
                                            <div key={member.id || member.email} className="flex items-center justify-between p-3 rounded-lg bg-surface hover:bg-surface-alt transition-colors border border-white/5 shadow-sm">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    {member.avatar_url ? (
                                                        <img src={member.avatar_url} alt={member.full_name} className="size-8 rounded-full object-cover shrink-0 ring-1 ring-white/10" />
                                                    ) : (
                                                        <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 ring-1 ring-primary/30">
                                                            <span className="text-primary text-xs font-bold">
                                                                {member.full_name?.charAt(0)?.toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-text truncate flex items-center gap-2">
                                                            {member.full_name}
                                                            {member.user_id === currentUser?.id && (
                                                                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary shrink-0">
                                                                    {t('projects.settings.you_badge')}
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-text-muted truncate">{member.email}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0 ml-4">
                                                    {member.role === 'owner' ? (
                                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 text-yellow-500 rounded-md text-xs font-medium border border-yellow-500/20 shadow-sm">
                                                            <ShieldStar className="size-3.5" weight="fill" />
                                                            {t('projects.settings.roles.owner')}
                                                        </div>
                                                    ) : isAdmin && fullProject?.owner_id !== member.user_id ? (
                                                        <div className="flex items-center gap-2">
                                                            <select
                                                                value={member.role}
                                                                onChange={(e) => updateRole.mutate({
                                                                    userId: member.user_id,
                                                                    role: e.target.value as Exclude<MemberRole, 'owner'>,
                                                                })}
                                                                disabled={updateRole.isPending && updateRole.variables?.userId === member.user_id}
                                                                className="glass-input h-8 pl-2 pr-8 py-0 rounded text-xs text-text appearance-none cursor-pointer focus:ring-1 focus:ring-primary disabled:opacity-50"
                                                                style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em' }}
                                                            >
                                                                <option value="admin">{t('projects.settings.roles.admin')}</option>
                                                                <option value="member">{t('projects.settings.roles.member')}</option>
                                                                <option value="viewer">{t('projects.settings.roles.viewer')}</option>
                                                            </select>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setRemoveMemberData({ isOpen: true, userId: member.user_id, userName: member.full_name });
                                                                }}
                                                                disabled={removeMember.isPending && removeMember.variables === member.user_id}
                                                                className="p-1.5 text-white/70 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50 ml-1 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                                                title={t('projects.settings.remove_member')}
                                                            >
                                                                <Trash className="size-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="px-3 py-1 bg-surface-alt text-text-muted rounded-md text-xs border border-white/5 capitalize shadow-sm">
                                                            {member.role}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'integrations' ? (
                        <ProjectIntegrationsTab projectId={project.id} isAdmin={isAdmin} />
                    ) : null}
                </div>
            </div>

            <ConfirmDialog
                isOpen={isDeleteProjectOpen}
                title={t('projects.settings.delete_project')}
                message={t('projects.settings.delete_confirm_msg')}
                confirmText={t('projects.settings.delete_project')}
                isDanger={true}
                onCancel={() => setIsDeleteProjectOpen(false)}
                onConfirm={() => {
                    setIsDeleteProjectOpen(false);
                    onDelete();
                }}
            />

            <ConfirmDialog
                isOpen={removeMemberData.isOpen}
                title={t('projects.settings.remove_member')}
                message={t('projects.settings.remove_confirm_msg', { name: removeMemberData.userName })}
                confirmText={t('projects.settings.remove_member')}
                isDanger={true}
                onCancel={() => setRemoveMemberData(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => {
                    setRemoveMemberData(prev => ({ ...prev, isOpen: false }));
                    removeMember.mutate(removeMemberData.userId);
                }}
            />
        </div >
    );
}
