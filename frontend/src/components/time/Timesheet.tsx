import { useWeeklyTimesheet, formatDuration } from '../../hooks/useTimeTracking';
import { Clock, Calendar } from 'lucide-react';

export function WeeklyTimesheet() {
    const { data, isLoading } = useWeeklyTimesheet();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
            </div>
        );
    }

    const days = data?.days || [];
    const totalSeconds = data?.totalSeconds || 0;

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="glass-panel p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-accent" />
                        <span className="text-sm font-medium text-text/70">Bu Hafta Toplam</span>
                    </div>
                    <span className="text-xl font-bold text-accent font-mono">{formatDuration(totalSeconds)}</span>
                </div>
            </div>

            {/* Daily breakdown */}
            <div className="space-y-2">
                {days.length === 0 ? (
                    <div className="text-center text-text/50 py-8 text-sm">
                        Bu hafta henüz zaman kaydı yok
                    </div>
                ) : (
                    days.map((day) => {
                        const date = new Date(day.date);
                        const dayName = date.toLocaleDateString('tr-TR', { weekday: 'long' });
                        const dateStr = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

                        return (
                            <div key={day.date} className="glass-panel p-3 rounded-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-text/50" />
                                        <span className="text-sm font-medium capitalize">{dayName}</span>
                                        <span className="text-xs text-text/40">{dateStr}</span>
                                    </div>
                                    <span className="text-sm font-mono font-medium text-accent">
                                        {formatDuration(day.totalSeconds)}
                                    </span>
                                </div>
                                {day.entries.length > 0 && (
                                    <div className="space-y-1 ml-6">
                                        {day.entries.map((entry) => (
                                            <div key={entry.id} className="flex items-center justify-between text-xs text-text/60">
                                                <span className="truncate max-w-[200px]">{entry.taskTitle || entry.taskId}</span>
                                                <span className="font-mono">{formatDuration(entry.durationSeconds || 0)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
