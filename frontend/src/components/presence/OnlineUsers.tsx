import { useActiveUsers } from '../../hooks/usePresence';

interface OnlineUsersProps {
    projectId: string;
}

export function OnlineUsers({ projectId }: OnlineUsersProps) {
    const { data: users = [] } = useActiveUsers(projectId);

    if (users.length === 0) return null;

    return (
        <div className="flex items-center gap-1">
            <div className="flex -space-x-2">
                {users.slice(0, 5).map((user) => (
                    <div
                        key={user.userId}
                        className="relative group"
                        title={`${user.fullName} - ${user.currentView || 'Çevrimiçi'}`}
                    >
                        {user.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt={user.fullName}
                                className="w-7 h-7 rounded-full border-2 border-surface ring-2 ring-green-500/50"
                            />
                        ) : (
                            <div className="w-7 h-7 rounded-full border-2 border-surface ring-2 ring-green-500/50 bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                                {user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                        )}
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-surface" />
                        {/* Tooltip */}
                        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                            <div className="bg-surface/95 backdrop-blur-sm text-xs px-2 py-1 rounded-lg border border-border shadow-lg">
                                {user.fullName}
                                {user.currentTaskId && <span className="text-accent ml-1">&middot; d&uuml;zenliyor</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {users.length > 5 && (
                <span className="text-xs text-text/50 ml-1">+{users.length - 5}</span>
            )}
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-1" />
            <span className="text-xs text-text/50">{users.length} &ccedil;evrimi&ccedil;i</span>
        </div>
    );
}
