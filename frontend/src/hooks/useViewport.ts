import { useEffect, useMemo, useState } from 'react';

interface ViewportState {
    width: number;
    height: number;
}

function readViewport(): ViewportState {
    return {
        width: window.innerWidth,
        height: window.innerHeight,
    };
}

export function useViewport() {
    const [viewport, setViewport] = useState<ViewportState>(() => readViewport());

    useEffect(() => {
        const updateViewport = () => {
            setViewport(readViewport());
        };

        window.addEventListener('resize', updateViewport);
        window.addEventListener('orientationchange', updateViewport);
        window.visualViewport?.addEventListener('resize', updateViewport);

        return () => {
            window.removeEventListener('resize', updateViewport);
            window.removeEventListener('orientationchange', updateViewport);
            window.visualViewport?.removeEventListener('resize', updateViewport);
        };
    }, []);

    return useMemo(() => {
        const isMobile = viewport.width <= 767;
        const isTablet = viewport.width >= 768 && viewport.width <= 1023;
        const isDesktop = viewport.width >= 1024;

        return {
            isMobile,
            isTablet,
            isDesktop,
            viewportHeight: viewport.height,
        };
    }, [viewport.height, viewport.width]);
}
