import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export function RequireAuth({ children }: PropsWithChildren) {
    const accessToken = useAuthStore((state) => state.accessToken);
    const location = useLocation();

    if (!accessToken) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    return <>{children}</>;
}
