import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeEntriesApi } from '../lib/api/timeEntries';
import { useState, useEffect, useRef } from 'react';

export function useActiveTimer() {
    return useQuery({
        queryKey: ['time-entries', 'active'],
        queryFn: async () => {
            const res = await timeEntriesApi.getActive();
            return res.data?.entry || null;
        },
        refetchInterval: 30000,
    });
}

export function useStartTimer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (taskId: string) => {
            const res = await timeEntriesApi.startTimer(taskId);
            if (!res.success) throw new Error(res.message || 'Failed to start timer');
            return res.data?.entry;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['time-entries'] });
        },
    });
}

export function useStopTimer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await timeEntriesApi.stopTimer(id);
            if (!res.success) throw new Error(res.message || 'Failed to stop timer');
            return res.data?.entry;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['time-entries'] });
        },
    });
}

export function useTaskTimeEntries(taskId: string) {
    return useQuery({
        queryKey: ['time-entries', 'task', taskId],
        queryFn: async () => {
            const res = await timeEntriesApi.getForTask(taskId);
            return res.data || { entries: [], totalSeconds: 0 };
        },
        enabled: !!taskId,
    });
}

export function useWeeklyTimesheet() {
    return useQuery({
        queryKey: ['time-entries', 'weekly'],
        queryFn: async () => {
            const res = await timeEntriesApi.getWeekly();
            return res.data || { days: [], totalSeconds: 0 };
        },
    });
}

export function useAddManualTime() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: { task_id: string; duration_seconds: number; note?: string }) => {
            const res = await timeEntriesApi.addManual(data);
            if (!res.success) throw new Error(res.message || 'Failed to add time entry');
            return res.data?.entry;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['time-entries'] });
        },
    });
}

// Elapsed time counter hook
export function useElapsedTime(startedAt: string | null) {
    const [elapsed, setElapsed] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!startedAt) {
            setElapsed(0);
            return;
        }
        const start = new Date(startedAt).getTime();
        const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
        update();
        intervalRef.current = setInterval(update, 1000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [startedAt]);

    return elapsed;
}

export function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}s ${m}dk`;
    if (m > 0) return `${m}dk ${s}sn`;
    return `${s}sn`;
}
