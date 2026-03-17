import { useActiveUsers } from '../../hooks/usePresence';
import { useAuthStore } from '../../stores/authStore';

interface EditingIndicatorProps {
    projectId: string;
    taskId: string;
}

export function EditingIndicator({ projectId, taskId }: EditingIndicatorProps) {
    const { data: users = [] } = useActiveUsers(projectId);
    const currentUserId = useAuthStore((s) => s.user?.id);

    const editors = users.filter(
        (u) => u.currentTaskId === taskId && u.userId !== currentUserId
    );

    if (editors.length === 0) return null;

    return (
        <div className="flex items-center gap-1 text-xs text-amber-400/80">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>{editors.map(e => e.fullName.split(' ')[0]).join(', ')} d&uuml;zenliyor...</span>
        </div>
    );
}
