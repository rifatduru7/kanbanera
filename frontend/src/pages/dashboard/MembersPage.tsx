import { useMemo, useState } from 'react';
import { UserPlus, Trash, Users, ShieldCheck, CircleNotch as Loader2 } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useAddMember, useProject, useProjects, useRemoveMember, useUpdateMemberRole } from '../../hooks/useKanbanData';

const MEMBER_ROLES = ['admin', 'member', 'viewer'] as const;

interface ProjectOption {
    id: string;
    name: string;
}

interface ProjectMember {
    id?: string;
    user_id: string;
    full_name: string;
    email: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
}

export function MembersPage() {
    const { t } = useTranslation();
    const currentUser = useAuthStore((state) => state.user);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<(typeof MEMBER_ROLES)[number]>('member');
    const [inviteError, setInviteError] = useState('');

    const { data: projectsData, isLoading: isProjectsLoading } = useProjects();
    const projects = useMemo<ProjectOption[]>(
        () => (projectsData?.projects ?? []) as ProjectOption[],
        [projectsData?.projects]
    );
    const effectiveProjectId = selectedProjectId || projects[0]?.id || '';

    const { data: projectData, isLoading: isProjectLoading } = useProject(effectiveProjectId);
    const addMember = useAddMember(effectiveProjectId);
    const updateMemberRole = useUpdateMemberRole(effectiveProjectId);
    const removeMember = useRemoveMember(effectiveProjectId);
    const members = useMemo<ProjectMember[]>(
        () => (projectData?.members ?? []) as ProjectMember[],
        [projectData?.members]
    );

    const permissions = useMemo(() => {
        const ownerId = projectData?.project?.owner_id;
        const isOwner = ownerId === currentUser?.id;
        const memberRecord = members.find((member) => member.user_id === currentUser?.id);
        const isAdmin = isOwner || memberRecord?.role === 'admin';
        return { isOwner, isAdmin };
    }, [currentUser?.id, members, projectData?.project?.owner_id]);

    const handleInvite = async (event: React.FormEvent) => {
        event.preventDefault();
        setInviteError('');

        if (!inviteEmail.trim()) return;

        try {
            await addMember.mutateAsync({ email: inviteEmail.trim(), role: inviteRole });
            setInviteEmail('');
            setInviteRole('member');
        } catch (error) {
            const message = error instanceof Error ? error.message : t('members.invite_error', 'Failed to invite member');
            setInviteError(message);
        }
    };

    if (isProjectsLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="glass-card rounded-2xl p-8 text-center">
                <Users className="size-10 text-text-muted mx-auto mb-3" />
                <h2 className="text-xl font-semibold text-text">{t('members.no_projects')}</h2>
                <p className="text-text-muted mt-2">{t('members.create_project_first')}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-text">{t('members.title')}</h2>
                    <p className="text-text-muted text-sm mt-1">{t('members.subtitle')}</p>
                </div>
                <select
                    value={effectiveProjectId}
                    onChange={(event) => setSelectedProjectId(event.target.value)}
                    className="glass-input rounded-lg px-3 py-2 w-full sm:w-auto min-w-[240px]"
                >
                    {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                            {project.name}
                        </option>
                    ))}
                </select>
            </div>

            {permissions.isAdmin && (
                <form onSubmit={handleInvite} className="glass-card rounded-2xl p-4 md:p-6 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-text">
                        <UserPlus className="size-5 text-primary" />
                        <h3 className="font-semibold">{t('members.invite_member')}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3">
                        <input
                            type="email"
                            className="glass-input rounded-lg px-3 py-2"
                            placeholder="name@company.com"
                            value={inviteEmail}
                            onChange={(event) => setInviteEmail(event.target.value)}
                            required
                        />
                        <select
                            value={inviteRole}
                            onChange={(event) => setInviteRole(event.target.value as (typeof MEMBER_ROLES)[number])}
                            className="glass-input rounded-lg px-3 py-2"
                        >
                            {MEMBER_ROLES.map((role) => (
                                <option key={role} value={role}>
                                    {t(`members.roles.${role}`)}
                                </option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            disabled={addMember.isPending}
                            className="btn-primary rounded-lg px-4 py-2 disabled:opacity-60"
                        >
                            {addMember.isPending ? t('members.inviting') : t('members.invite_btn')}
                        </button>
                    </div>
                    {inviteError ? <p className="text-red-400 text-sm">{inviteError}</p> : null}
                </form>
            )}

            <div className="glass-card rounded-2xl p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-text">{t('members.project_members')}</h3>
                    {isProjectLoading && <Loader2 className="size-5 animate-spin text-primary" />}
                </div>

                <div className="space-y-2">
                    {members.map((member) => {
                        const isOwnerMember = member.role === 'owner';
                        const canManage = permissions.isAdmin && !isOwnerMember && member.user_id !== currentUser?.id;
                        const isCurrentUpdating = updateMemberRole.isPending && updateMemberRole.variables?.userId === member.user_id;
                        const isCurrentRemoving = removeMember.isPending && removeMember.variables === member.user_id;

                        return (
                            <div key={member.id || member.user_id} className="flex items-center justify-between rounded-lg border border-border p-3">
                                <div className="min-w-0">
                                    <p className="text-text font-medium truncate">{member.full_name}</p>
                                    <p className="text-text-muted text-sm truncate">{member.email}</p>
                                </div>

                                <div className="flex items-center gap-2 ml-4">
                                    {isOwnerMember ? (
                                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                            <ShieldCheck className="size-3.5" />
                                            {t('members.roles.owner')}
                                        </span>
                                    ) : canManage ? (
                                        <>
                                            <select
                                                className="glass-input rounded-md px-2 py-1 text-sm"
                                                value={member.role}
                                                onChange={(event) => updateMemberRole.mutate({
                                                    userId: member.user_id,
                                                    role: event.target.value as (typeof MEMBER_ROLES)[number],
                                                })}
                                                disabled={isCurrentUpdating}
                                            >
                                                {MEMBER_ROLES.map((role) => (
                                                    <option key={role} value={role}>
                                                        {t(`members.roles.${role}`)}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => removeMember.mutate(member.user_id)}
                                                disabled={isCurrentRemoving}
                                                className="p-2 rounded-md border border-border hover:bg-surface-alt text-text-muted hover:text-red-400 transition-colors"
                                            >
                                                <Trash className="size-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <span className="text-xs px-2 py-1 rounded-md border border-border text-text-muted">{t(`members.roles.${member.role}`)}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
