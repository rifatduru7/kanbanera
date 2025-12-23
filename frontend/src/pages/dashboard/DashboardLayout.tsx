import { useState } from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { Outlet } from 'react-router-dom';

export function DashboardLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [lastSynced, setLastSynced] = useState<Date | null>(new Date());

    const handleRefresh = async () => {
        // TODO: Implement actual data refresh
        setLastSynced(new Date());
    };

    return (
        <div className="flex h-screen w-full relative">
            {/* Sidebar - Hidden on mobile */}
            <div className="hidden lg:block">
                <Sidebar
                    isCollapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark">
                {/* Subtle overlay for depth */}
                <div className="absolute inset-0 bg-background-dark/95 pointer-events-none z-0" />

                {/* Header */}
                <Header
                    projectName="Projects"
                    sprintName="Sprint 4"
                    isActive={true}
                    onRefresh={handleRefresh}
                    lastSynced={lastSynced}
                />

                {/* Content - Extra bottom padding for mobile nav */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-24 lg:pb-8 z-0 relative">
                    <div className="max-w-7xl mx-auto flex flex-col gap-8">
                        <Outlet />
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <BottomNav />
        </div>
    );
}
