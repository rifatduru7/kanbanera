import { useState } from 'react';

export function useFeaturesTour() {
    const [isOpen, setIsOpen] = useState(false);

    const checkAndShow = () => {
        const hasSeen = localStorage.getItem('era-kanban-tour-seen');
        if (!hasSeen) {
            setTimeout(() => setIsOpen(true), 300);
        }
    };

    const complete = () => {
        localStorage.setItem('era-kanban-tour-seen', 'true');
        setIsOpen(false);
    };

    const skip = () => {
        localStorage.setItem('era-kanban-tour-seen', 'true');
        setIsOpen(false);
    };

    return {
        isOpen,
        show: () => setIsOpen(true),
        checkAndShow,
        complete,
        skip,
    };
}
