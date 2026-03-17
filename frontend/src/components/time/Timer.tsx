import { Play, Square, Clock } from 'lucide-react';
import { useActiveTimer, useStartTimer, useStopTimer, useElapsedTime, formatDuration } from '../../hooks/useTimeTracking';
import toast from 'react-hot-toast';

// Global active timer bar (shown in header/sidebar)
export function ActiveTimerBar() {
    const { data: activeEntry } = useActiveTimer();
    const stopTimer = useStopTimer();
    const elapsed = useElapsedTime(activeEntry?.startedAt || null);

    if (!activeEntry) return null;

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent/20 border border-accent/30 text-sm">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <Clock className="w-3.5 h-3.5 text-accent" />
            <span className="font-mono text-accent font-medium">{formatDuration(elapsed)}</span>
            <button
                onClick={() => {
                    stopTimer.mutate(activeEntry.id, {
                        onSuccess: () => toast.success('Zamanlayıcı durduruldu'),
                        onError: () => toast.error('Zamanlayıcı durdurulamadı'),
                    });
                }}
                className="ml-1 p-1 rounded-lg hover:bg-white/10 transition-colors"
                title="Zamanlayıcıyı durdur"
            >
                <Square className="w-3.5 h-3.5 text-red-400" />
            </button>
        </div>
    );
}

// Timer toggle for task cards/modals
export function TaskTimerButton({ taskId, taskTitle }: { taskId: string; taskTitle: string }) {
    const { data: activeEntry } = useActiveTimer();
    const startTimer = useStartTimer();
    const stopTimer = useStopTimer();
    const isActiveForThis = activeEntry?.taskId === taskId;
    const elapsed = useElapsedTime(isActiveForThis ? activeEntry?.startedAt || null : null);

    const handleToggle = () => {
        if (isActiveForThis && activeEntry) {
            stopTimer.mutate(activeEntry.id, {
                onSuccess: () => toast.success('Zamanlayıcı durduruldu'),
                onError: () => toast.error('Zamanlayıcı durdurulamadı'),
            });
        } else if (activeEntry) {
            toast.error('Başka bir task için zamanlayıcı çalışıyor. Önce onu durdurun.');
        } else {
            startTimer.mutate(taskId, {
                onSuccess: () => toast.success(`Zamanlayıcı başlatıldı: ${taskTitle}`),
                onError: (err) => toast.error(err.message),
            });
        }
    };

    return (
        <button
            onClick={handleToggle}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActiveForThis
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                    : 'bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20'
            }`}
        >
            {isActiveForThis ? (
                <>
                    <Square className="w-3 h-3" />
                    <span className="font-mono">{formatDuration(elapsed)}</span>
                </>
            ) : (
                <>
                    <Play className="w-3 h-3" />
                    <span>Başlat</span>
                </>
            )}
        </button>
    );
}
