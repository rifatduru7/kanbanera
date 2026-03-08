import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { kanbanKeys } from './useKanbanData';

interface UsePollingOptions {
    enabled?: boolean;
    interval?: number;
    onUpdate?: () => void;
}

/**
 * Custom hook for polling project data at regular intervals.
 * Automatically refetches project data to keep the board in sync.
 */
export function usePolling(projectId: string, options: UsePollingOptions = {}) {
    const { enabled = true, interval = 30000, onUpdate } = options;
    const queryClient = useQueryClient();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isVisible = useRef(true);

    const stopPolling = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const refetch = useCallback(async () => {
        if (!projectId || !isVisible.current) return;

        try {
            await queryClient.invalidateQueries({
                queryKey: kanbanKeys.project(projectId),
            });
            onUpdate?.();
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, [projectId, queryClient, onUpdate]);

    const startPolling = useCallback(() => {
        if (!enabled || !projectId || intervalRef.current) return;
        intervalRef.current = setInterval(refetch, interval);
    }, [enabled, interval, projectId, refetch]);

    // Set up polling interval
    useEffect(() => {
        if (!enabled || !projectId) return;

        startPolling();

        return () => {
            stopPolling();
        };
    }, [enabled, interval, projectId, startPolling, stopPolling]);

    // Pause polling when tab is not visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            isVisible.current = !document.hidden;

            if (document.hidden) {
                // Pause polling
                stopPolling();
            } else {
                // Resume polling and refetch immediately
                refetch();
                startPolling();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [refetch, startPolling, stopPolling]);

    // Refetch on window focus
    useEffect(() => {
        const handleFocus = () => {
            if (enabled && projectId) {
                refetch();
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [enabled, projectId, refetch]);

    return {
        refetch,
        isPolling: enabled && !!projectId,
    };
}

/**
 * Simple hook for countdown timer display
 */
export function useCountdown(seconds: number, onComplete?: () => void) {
    const [remaining, setRemaining] = useState(seconds);

    useEffect(() => {
        if (remaining <= 0) {
            onComplete?.();
            return;
        }

        const timer = setTimeout(() => {
            setRemaining(remaining - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [remaining, onComplete]);

    return remaining;
}
