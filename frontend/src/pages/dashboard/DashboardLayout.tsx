import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { SearchModal } from '../../components/ui/SearchModal';
import { FeaturesTourModal } from '../../components/onboarding/FeaturesTourModal';
import { OnboardingComplete } from '../../components/onboarding/OnboardingComplete';
import { CreateProjectModal } from '../../components/project/CreateProjectModal';
import { Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '../../hooks/useAuth';
import { useFeaturesTour } from '../../hooks/useFeaturesTour';
import { useSearchModal } from '../../hooks/useSearchModal';
import { useTranslation } from 'react-i18next';
import { useProjects } from '../../hooks/useKanbanData';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export function DashboardLayout() {
    const { t } = useTranslation();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [lastSynced, setLastSynced] = useState<Date | null>(new Date());
    const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
    const [isOnboardingSuccessOpen, setIsOnboardingSuccessOpen] = useState(false);

    const searchModal = useSearchModal();
    const featuresTour = useFeaturesTour();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { data: projectsData } = useProjects();

    // Initialize push notifications system
    usePushNotifications();

    // Fetch user on mount if they have an active session
    const { isLoading: isUserLoading } = useCurrentUser();

    // Close mobile sidebar on navigation
    useEffect(() => {
        setIsMobileSidebarOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!isMobileSidebarOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isMobileSidebarOpen]);

    // Check if we should show features tour on mount
    useEffect(() => {
        featuresTour.checkAndShow();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const headerMeta = useMemo(() => {
        const path = location.pathname;
        const projects = projectsData?.projects ?? [];
        const boardProjectId = searchParams.get('project');
        const boardProject =
            projects.find((project) => project.id === boardProjectId) ||
            projects[0];

        if (path.startsWith('/board')) {
            return {
                projectName: t('nav.board'),
                sprintName: boardProject?.name,
                isActive: boardProject ? !boardProject.is_archived : false,
            };
        }
        if (path.startsWith('/projects')) {
            return { projectName: t('nav.projects'), sprintName: undefined, isActive: false };
        }
        if (path.startsWith('/calendar')) {
            return { projectName: t('nav.calendar'), sprintName: undefined, isActive: false };
        }
        if (path.startsWith('/metrics')) {
            return { projectName: t('nav.metrics'), sprintName: undefined, isActive: false };
        }
        if (path.startsWith('/members')) {
            return { projectName: t('nav.members'), sprintName: undefined, isActive: false };
        }
        if (path.startsWith('/admin')) {
            return { projectName: t('nav.admin'), sprintName: undefined, isActive: false };
        }
        if (path.startsWith('/settings') || path.startsWith('/profile')) {
            return { projectName: t('nav.profile'), sprintName: undefined, isActive: false };
        }

        return { projectName: t('nav.dashboard'), sprintName: undefined, isActive: false };
    }, [location.pathname, projectsData?.projects, searchParams, t]);

    if (isUserLoading) {
        return (
            <div className="flex h-[100dvh] w-full items-center justify-center bg-background">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const handleRefresh = async () => {
        setLastSynced(new Date());
    };

    const handleTourComplete = () => {
        featuresTour.complete();
        setIsCreateProjectOpen(true);
    };

    const handleProjectCreated = () => {
        setIsOnboardingSuccessOpen(true);
    };

    return (
        <div className="flex h-[100dvh] w-full relative">
            {/* Sidebar - Desktop */}
            <div className="hidden lg:block h-full">
                <Sidebar
                    isCollapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                />
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileSidebarOpen && (
                <div
                    className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in duration-300"
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}

            {/* Mobile Sidebar Drawer */}
            <div className={`
                fixed inset-y-0 left-0 z-[70] lg:hidden transition-transform duration-300 ease-in-out transform
                ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <Sidebar
                    isCollapsed={false}
                    onToggle={() => setIsMobileSidebarOpen(false)}
                />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-background">
                {/* Subtle overlay for depth */}
                <div className="absolute inset-0 bg-background/95 pointer-events-none z-0" />

                {/* Header */}
                <Header
                    projectName={headerMeta.projectName}
                    sprintName={headerMeta.sprintName}
                    isActive={headerMeta.isActive}
                    onRefresh={handleRefresh}
                    lastSynced={lastSynced}
                    onSearchClick={searchModal.open}
                    onMenuClick={() => setIsMobileSidebarOpen(true)}
                />

                {/* Content - Extra bottom padding for mobile nav */}
                <div className="flex-1 min-h-0 overflow-y-auto mobile-scroll p-4 sm:p-5 md:p-8 pb-safe-nav lg:pb-8 z-0 relative">
                    <div className="max-w-7xl mx-auto w-full lg:h-full min-h-0 flex flex-col gap-8">
                        <Outlet />
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <BottomNav />

            {/* Global Search Modal (Cmd+K) */}
            {searchModal.isOpen && <SearchModal isOpen={searchModal.isOpen} onClose={searchModal.close} mobileFullScreen={true} />}

            {/* Features Tour Modal for new users */}
            {featuresTour.isOpen && (
                <FeaturesTourModal
                    onComplete={handleTourComplete}
                    onSkip={featuresTour.skip}
                />
            )}

            {/* Onboarding Complete Modal */}
            {isOnboardingSuccessOpen && (
                <OnboardingComplete
                    onGoToDashboard={() => {
                        setIsOnboardingSuccessOpen(false);
                        navigate('/dashboard');
                    }}
                    onClose={() => setIsOnboardingSuccessOpen(false)}
                />
            )}

            {/* Create Project Modal */}
            <CreateProjectModal
                isOpen={isCreateProjectOpen}
                onClose={() => setIsCreateProjectOpen(false)}
                onProjectCreated={handleProjectCreated}
            />
        </div>
    );
}
