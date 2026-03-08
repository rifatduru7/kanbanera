import { useEffect, useState } from 'react';

export function useWelcomeModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const hasSeenWelcome = localStorage.getItem('era-kanban-welcome-seen');
        if (hasSeenWelcome) {
            return;
        }

        const timer = setTimeout(() => setIsOpen(true), 500);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        localStorage.setItem('era-kanban-welcome-seen', 'true');
        setIsOpen(false);
    };

    return {
        isWelcomeOpen: isOpen,
        closeWelcome: handleClose,
        showWelcome: () => setIsOpen(true),
    };
}
