'use client';

import { useTranslation } from 'react-i18next';
import { Clock } from '@phosphor-icons/react';
import { WeeklyTimesheet } from '../../components/time/Timesheet';

export function TimesheetPage() {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col lg:h-full min-h-0 overflow-visible lg:overflow-hidden">
            {/* Header */}
            <header className="flex-shrink-0 px-4 sm:px-6 py-5 sm:py-6 border-b border-border">
                <div className="flex items-center gap-3">
                    <Clock className="size-8 text-primary" />
                    <div>
                        <h2 className="text-3xl font-bold text-text tracking-tight">
                            {t('nav.timesheet', 'Zaman Takibi')}
                        </h2>
                        <p className="text-text-muted text-sm">
                            {t('timesheet.subtitle', 'Haftalık çalışma sürelerinizi görüntüleyin')}
                        </p>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="p-4 sm:p-6 lg:flex-1 lg:min-h-0 lg:overflow-y-auto mobile-scroll">
                <WeeklyTimesheet />
            </div>
        </div>
    );
}

export default TimesheetPage;
