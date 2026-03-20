import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    SquaresFour as LayoutDashboard,
    Folder as FolderKanban,
    Kanban,
    GearSix as Settings,
    Users,
    CaretDown as ChevronDown,
    CaretLeft as ChevronLeft,
    CaretRight as ChevronRight,
    CalendarBlank as Calendar,
    ChartLineUp as GanttIcon,
    ChartBar as BarChart3,
    ShieldCheck as Shield,
    User,
    SignOut,
    Lightning,
    Timer,
    BookOpenText,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { AnimatedIcon } from '../ui/AnimatedIcon';
import { BrandLogoMark } from '../ui/BrandLogoMark';
import { ActiveTimerBar } from '../time/Timer';

interface NavItem {
    labelKey: string;
    icon: React.ElementType;
    href: string;
}

const menuItems: NavItem[] = [
    { labelKey: 'nav.dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { labelKey: 'nav.projects', icon: FolderKanban, href: '/projects' },
    { labelKey: 'nav.board', icon: Kanban, href: '/board' },
    { labelKey: 'nav.calendar', icon: Calendar, href: '/calendar' },
    { labelKey: 'nav.gantt', icon: GanttIcon, href: '/gantt' },
    { labelKey: 'nav.metrics', icon: BarChart3, href: '/metrics' },
    { labelKey: 'nav.flows', icon: Lightning, href: '/flows' },
    { labelKey: 'nav.timesheet', icon: Timer, href: '/timesheet' },
    { labelKey: 'nav.docs', icon: BookOpenText, href: '/docs' },
    { labelKey: 'nav.settings', icon: Settings, href: '/settings' },
];

const teamItems: NavItem[] = [
    { labelKey: 'nav.members', icon: Users, href: '/members' },
    { labelKey: 'nav.admin', icon: Shield, href: '/admin' },
];

interface SidebarProps {
    isCollapsed?: boolean;
    onToggle?: () => void;
}

export function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const [collapsed, setCollapsed] = useState(isCollapsed);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const filteredTeamItems = teamItems.filter(item =>
        item.href !== '/admin' || user?.role === 'admin'
    );

    const handleToggle = () => {
        setCollapsed(!collapsed);
        onToggle?.();
    };

    return (
        <motion.aside
            initial={false}
            animate={{ width: collapsed ? 80 : 288 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex-shrink-0 flex flex-col justify-between glass-panel relative z-20 h-full pt-safe lg:pt-0 overflow-hidden"
        >
            <div className="flex flex-col h-full w-full overflow-hidden">
                {/* Logo & Brand */}
                <div className="p-6 flex items-center gap-3 overflow-hidden">
                    <div className="relative flex items-center justify-center size-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/20">
                        <BrandLogoMark className="text-text size-6" animated={true} />
                    </div>
                    <AnimatePresence mode="wait">
                        {!collapsed && (
                            <motion.div
                                key="brand-text"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col whitespace-nowrap overflow-hidden"
                            >
                                <h1 className="text-text text-lg font-bold leading-none tracking-tight">
                                    Era Kanban
                                </h1>
                                <p className="text-text-muted text-xs font-medium mt-1">{t('common.workspace')}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Active Timer */}
                <AnimatePresence mode="wait">
                    {!collapsed && (
                        <motion.div
                            key="timer-bar"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-6 mb-4 overflow-hidden"
                        >
                            <ActiveTimerBar />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Navigation */}
                <nav className="flex-1 flex flex-col gap-1 px-3 py-2 overflow-y-auto mobile-scroll overflow-x-hidden">
                    <AnimatePresence mode="wait">
                        {!collapsed && (
                            <motion.p
                                key="menu-label"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-text-muted text-[10px] font-bold uppercase tracking-wider px-3 mb-1 whitespace-nowrap"
                            >
                                {t('common.menu')}
                            </motion.p>
                        )}
                    </AnimatePresence>

                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={`
                                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all group overflow-hidden
                                    ${isActive
                                        ? 'bg-primary/10 text-primary border border-primary/10 shadow-[0_0_15px_rgba(19,146,236,0.05)]'
                                        : 'text-text-muted hover:text-text hover:bg-surface-alt'
                                    }
                                    ${collapsed ? 'justify-center h-10' : 'h-11'}
                                `}
                                title={collapsed ? t(item.labelKey) : undefined}
                            >
                                <div className="flex-shrink-0">
                                    <AnimatedIcon
                                        icon={Icon}
                                        animation={isActive ? 'active' : 'hover'}
                                        className={`size-5 ${isActive ? '' : 'group-hover:text-primary'}`}
                                        strokeWidth={isActive ? 2.5 : 2}
                                    />
                                </div>
                                <AnimatePresence mode="wait">
                                    {!collapsed && (
                                        <motion.span
                                            key={`label-${item.href}`}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className={`text-sm whitespace-nowrap flex-1 ${isActive ? 'font-bold' : 'font-medium'}`}
                                        >
                                            {t(item.labelKey)}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </Link>
                        );
                    })}

                    <AnimatePresence mode="wait">
                        {!collapsed && (
                            <motion.div
                                key="team-section"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <div className="my-2 border-t border-border-muted mx-3" />
                                <p className="text-text-muted text-[10px] font-bold uppercase tracking-wider px-3 mb-1 mt-2 whitespace-nowrap">
                                    {t('common.team')}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {filteredTeamItems.map((item) => {
                        const isActive = location.pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={`
                                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all group overflow-hidden
                                    ${isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-text-muted hover:text-text hover:bg-surface-alt'
                                    }
                                    ${collapsed ? 'justify-center h-10' : 'h-11'}
                                `}
                                title={collapsed ? t(item.labelKey) : undefined}
                            >
                                <div className="flex-shrink-0">
                                    <AnimatedIcon icon={Icon} animation={isActive ? 'active' : 'hover'} className="size-5 group-hover:text-primary" />
                                </div>
                                <AnimatePresence mode="wait">
                                    {!collapsed && (
                                        <motion.span
                                            key={`label-${item.href}`}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className="text-sm font-medium whitespace-nowrap flex-1"
                                        >
                                            {t(item.labelKey)}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile */}
                <div className="p-3 mt-auto relative overflow-hidden" ref={profileMenuRef}>
                    <AnimatePresence>
                        {isProfileMenuOpen && (
                            <motion.div
                                key="profile-menu"
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full left-3 right-3 mb-2 glass-panel !bg-surface !border-border-muted rounded-xl p-1.5 shadow-xl shadow-black/20 z-50 overflow-hidden"
                            >
                                {!collapsed && (
                                    <>
                                        <Link
                                            to="/profile"
                                            onClick={() => setIsProfileMenuOpen(false)}
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-surface-alt rounded-lg transition-colors w-full text-left"
                                        >
                                            <User className="size-4 flex-shrink-0" />
                                            <span className="whitespace-nowrap truncate">{t('profile.title', 'Profile')}</span>
                                        </Link>
                                        <Link
                                            to="/settings"
                                            onClick={() => setIsProfileMenuOpen(false)}
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-surface-alt rounded-lg transition-colors w-full text-left"
                                        >
                                            <Settings className="size-4 flex-shrink-0" />
                                            <span className="whitespace-nowrap truncate">{t('nav.settings', 'Settings')}</span>
                                        </Link>
                                        <div className="h-px bg-border-muted my-1 mx-1" />
                                    </>
                                )}
                                <button
                                    onClick={handleLogout}
                                    className={`flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors w-full text-left overflow-hidden ${collapsed ? 'justify-center' : ''}`}
                                    title={collapsed ? t('nav.logout', 'Logout') : undefined}
                                >
                                    <div className="flex-shrink-0">
                                        <AnimatedIcon icon={SignOut} animation="hover" className="size-4" />
                                    </div>
                                    {!collapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{t('nav.logout', 'Logout')}</span>}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div
                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                        className="glass-panel !bg-surface-alt !border-border-muted rounded-xl p-2.5 flex items-center gap-3 cursor-pointer hover:bg-surface-alt/80 transition-colors overflow-hidden"
                    >
                        <div className="size-9 flex-shrink-0 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-primary font-semibold text-sm overflow-hidden">
                            <span className="whitespace-nowrap flex-shrink-0">
                                {user?.fullName ? `${user.fullName.split(' ')[0][0]}${user.fullName.split(' ')[1]?.[0] || ''}`.toUpperCase() : 'U'}
                            </span>
                        </div>
                        <AnimatePresence mode="wait">
                            {!collapsed && (
                                <motion.div
                                    key="user-info"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="flex-1 min-w-0"
                                >
                                    <p className="text-sm font-semibold text-text truncate">{user?.fullName || t('common.user')}</p>
                                    <p className="text-xs text-text-muted truncate capitalize">{t(`common.roles.${user?.role || 'member'}`)}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <AnimatePresence mode="wait">
                            {!collapsed && (
                                <motion.div
                                    key="chevron-down"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <AnimatedIcon icon={ChevronDown} animation="hover" className={`text-text-muted size-3.5 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Collapse Toggle */}
            <button
                onClick={handleToggle}
                className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 size-6 rounded-full bg-surface border border-border items-center justify-center text-text-muted hover:text-text hover:bg-surface-alt transition-all z-30 shadow-sm"
            >
                {collapsed ? (
                    <AnimatedIcon icon={ChevronRight} animation="hover" className="size-3" />
                ) : (
                    <AnimatedIcon icon={ChevronLeft} animation="hover" className="size-3" />
                )}
            </button>
        </motion.aside>
    );
}
