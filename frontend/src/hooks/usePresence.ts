import { useQuery, useQueryClient } from '@tanstack/react-query';
import { presenceApi } from '../lib/api/presence';
import { useEffect, useRef, useCallback } from 'react';

export function usePresence(projectId: string | null, currentView?: string, currentTaskId?: string) {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const sendHeartbeat = useCallback(async () => {
        if (!projectId) return;
        try {
            await presenceApi.heartbeat({
                project_id: projectId,
                current_view: currentView,
                current_task_id: currentTaskId,
            });
        } catch {
            // Silently fail heartbeats
        }
    }, [projectId, currentView, currentTaskId]);

    useEffect(() => {
        if (!projectId) return;

        // Send initial heartbeat
        sendHeartbeat();

        // Send heartbeat every 10 seconds
        intervalRef.current = setInterval(sendHeartbeat, 10000);

        // Go offline on unmount
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            presenceApi.goOffline().catch(() => {});
        };
    }, [projectId, sendHeartbeat]);

    return null;
}

export function useActiveUsers(projectId: string) {
    return useQuery({
        queryKey: ['presence', projectId],
        queryFn: async () => {
            const res = await presenceApi.getActiveUsers(projectId);
            return res.data?.users || [];
        },
        enabled: !!projectId,
        refetchInterval: 10000,
    });
}

export function useBoardEvents(projectId: string) {
    const lastCheckRef = useRef(new Date().toISOString());
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: ['board-events', projectId],
        queryFn: async () => {
            const since = lastCheckRef.current;
            const res = await presenceApi.getEvents(projectId, since);
            lastCheckRef.current = new Date().toISOString();

            const events = res.data?.events || [];
            // If there are events, invalidate board data for fresh data
            if (events.length > 0) {
                queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
            }
            return events;
        },
        enabled: !!projectId,
        refetchInterval: 5000, // Check for events every 5 seconds
    });
}
