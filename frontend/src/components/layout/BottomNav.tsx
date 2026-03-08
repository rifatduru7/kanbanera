import { Link, useLocation } from 'react-router-dom';
import { SquaresFour as LayoutDashboard, Folder as FolderKanban, Kanban, CalendarBlank as Calendar, User } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { AnimatedIcon } from '../ui/AnimatedIcon';

export function BottomNav() {
    const { t } = useTranslation();
    const location = useLocation();

    const navItems = [
        { icon: LayoutDashboard, label: t('nav.dashboard'), href: '/dashboard' },
        { icon: FolderKanban, label: t('nav.projects'), href: '/projects' },
        { icon: Kanban, label: t('nav.board'), href: '/board' },
        { icon: Calendar, label: t('nav.calendar'), href: '/calendar' },
        { icon: User, label: t('nav.profile'), href: '/profile' },
    ];

    return (
        <nav
            className="fixed inset-safe z-40 lg:hidden max-w-lg mx-auto"
            style={{ bottom: 'max(0.5rem, var(--safe-bottom))' }}
        >
            {/* Glass background with subtle border and rich shadow */}
            <div className="absolute inset-0 bg-surface/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5" />

            {/* Navigation items */}
            <div className="relative flex items-center justify-around px-2 py-2">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={`relative flex flex-col items-center gap-1.5 px-2 min-h-11 justify-center transition-all duration-300 ${isActive ? 'text-primary' : 'text-text-muted hover:text-text'
                                }`}
                        >
                            <div
                                className={`relative p-2.5 rounded-2xl transition-all duration-300 ${isActive
                                        ? 'bg-primary/15 shadow-[0_0_20px_rgba(40,170,226,0.3)] scale-110'
                                        : 'hover:bg-white/5'
                                    }`}
                            >
                                <AnimatedIcon
                                    icon={Icon}
                                    animation={isActive ? 'active' : 'hover'}
                                    className={`size-5.5 transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_8px_rgba(40,170,226,0.6)]' : ''}`}
                                    weight={isActive ? 'duotone' : 'regular'}
                                />
                                {isActive && (
                                    <span className="absolute -top-1 -right-1 size-2.5 bg-primary rounded-full ring-2 ring-surface shadow-[0_0_10px_rgba(40,170,226,0.8)] animate-pulse" />
                                )}
                            </div>
                            <span className={`text-[9px] uppercase tracking-wider font-bold transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-40 -translate-y-0.5'
                                }`}>
                                {item.label}
                            </span>

                            {/* Visual glow indicator at the bottom of active item */}
                            {isActive && (
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full blur-[1px] shadow-[0_0_8px_rgba(40,170,226,1)]" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
