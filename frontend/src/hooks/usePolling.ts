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

    // Set up polling interval
    useEffect(() => {
        if (!enabled || !projectId) return;

        intervalRef.current = setInterval(refetch, interval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [enabled, interval, projectId, refetch]);

    // Pause polling when tab is not visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            isVisible.current = !document.hidden;

            if (document.hidden) {
                // Pause polling
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            } else {
                // Resume polling and refetch immediately
                refetch();
                if (enabled && projectId) {
                    intervalRef.current = setInterval(refetch, interval);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [enabled, interval, projectId, refetch]);

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
        isPolling: !!intervalRef.current,
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
