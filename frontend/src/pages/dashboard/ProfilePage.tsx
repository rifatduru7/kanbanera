import { useState } from 'react';
import { User, Mail, Lock, Moon, Sun, Monitor, Bell, Trash2, Camera, Shield } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

type Theme = 'light' | 'dark' | 'system';

export function ProfilePage() {
    const { user } = useAuthStore();
    const [firstName, setFirstName] = useState(user?.fullName?.split(' ')[0] || 'Alex');
    const [lastName, setLastName] = useState(user?.fullName?.split(' ').slice(1).join(' ') || 'Morgan');
    const [theme, setTheme] = useState<Theme>('dark');
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    const handleSaveChanges = () => {
        // TODO: API call to update profile
        console.log('Saving profile:', { firstName, lastName });
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <header className="flex-shrink-0 px-6 py-6 border-b border-border">
                <div className="flex items-center gap-3">
                    <User className="size-8 text-primary" />
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">User Profile</h2>
                        <p className="text-text-muted text-sm">Manage your personal details and account security.</p>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 p-6 lg:p-10">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Left Column: Profile Card */}
                        <div className="lg:col-span-4 lg:sticky lg:top-6">
                            <div className="glass-card rounded-2xl p-6 flex flex-col items-center text-center shadow-xl">
                                {/* Avatar */}
                                <div className="relative group cursor-pointer mb-5">
                                    <div className="size-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center text-primary text-3xl font-bold border-4 border-surface shadow-lg transition-transform group-hover:scale-105">
                                        {firstName.charAt(0)}{lastName.charAt(0)}
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <Camera className="text-white size-6" />
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-white">{firstName} {lastName}</h3>
                                <div className="flex items-center justify-center gap-1.5 mt-1 text-text-muted text-sm">
                                    <Lock className="size-4" />
                                    <span>{user?.email || 'alex@erakanban.com'}</span>
                                </div>

                                {/* Badges */}
                                <div className="mt-5 flex gap-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary ring-1 ring-inset ring-primary/20">
                                        <span className="size-1.5 rounded-full bg-primary" />
                                        Admin
                                    </span>
                                    <span className="inline-flex items-center rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400 ring-1 ring-inset ring-purple-500/20">
                                        Pro Plan
                                    </span>
                                </div>

                                {/* Stats */}
                                <div className="mt-8 pt-6 border-t border-border w-full space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-text-muted">Member since</span>
                                        <span className="text-white font-medium">Dec 2024</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-text-muted">Last active</span>
                                        <span className="text-white font-medium">Just now</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Settings Sections */}
                        <div className="lg:col-span-8 flex flex-col gap-8">
                            {/* Personal Information */}
                            <section className="glass-card rounded-2xl p-6 md:p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Personal Information</h3>
                                        <p className="text-sm text-text-muted mt-1">Update your photo and personal details.</p>
                                    </div>
                                </div>

                                <form className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-medium text-text-muted">First Name</label>
                                            <input
                                                type="text"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                className="glass-input w-full p-2.5 rounded-lg"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-medium text-text-muted">Last Name</label>
                                            <input
                                                type="text"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                className="glass-input w-full p-2.5 rounded-lg"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-text-muted">Email Address</label>
                                        <div className="relative">
                                            <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 size-5" />
                                            <input
                                                type="email"
                                                value={user?.email || 'alex@erakanban.com'}
                                                disabled
                                                className="glass-input w-full py-2.5 pl-10 pr-10 rounded-lg text-gray-400 cursor-not-allowed"
                                            />
                                            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 size-4" />
                                        </div>
                                        <p className="text-xs text-text-muted/60">Email address cannot be changed for security reasons.</p>
                                    </div>

                                    <div className="pt-4 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleSaveChanges}
                                            className="btn-primary py-2.5 px-6 rounded-lg font-semibold text-sm shadow-[0_0_15px_rgba(19,185,165,0.3)]"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </form>
                            </section>

                            {/* Security */}
                            <section className="glass-card rounded-2xl p-6 md:p-8">
                                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                    <Shield className="size-5 text-primary" />
                                    Security
                                </h3>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between pb-6 border-b border-border">
                                        <div>
                                            <h4 className="text-sm font-medium text-white">Password</h4>
                                            <p className="text-sm text-text-muted mt-1">Last changed 3 months ago</p>
                                        </div>
                                        <button className="rounded-lg border border-border bg-transparent px-4 py-2 text-sm font-medium text-white hover:bg-white/5 transition-colors">
                                            Change Password
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-medium text-white">Two-factor Authentication</h4>
                                            <p className="text-sm text-text-muted mt-1">Add an extra layer of security.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={twoFactorEnabled}
                                                onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                                        </label>
                                    </div>
                                </div>
                            </section>

                            {/* Preferences */}
                            <section className="glass-card rounded-2xl p-6 md:p-8">
                                <h3 className="text-lg font-semibold text-white mb-6">Preferences</h3>

                                <div className="space-y-6">
                                    {/* Theme */}
                                    <div className="flex flex-col gap-3">
                                        <label className="text-sm font-medium text-white">Interface Theme</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { value: 'light', icon: Sun, label: 'Light' },
                                                { value: 'dark', icon: Moon, label: 'Dark' },
                                                { value: 'system', icon: Monitor, label: 'System' },
                                            ].map((option) => {
                                                const Icon = option.icon;
                                                const isActive = theme === option.value;
                                                return (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => setTheme(option.value as Theme)}
                                                        className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                                                                ? 'border-primary bg-primary/10 text-primary'
                                                                : 'border-border bg-surface text-text-muted hover:bg-surface-hover hover:text-white'
                                                            }`}
                                                    >
                                                        <Icon className="size-4" />
                                                        {option.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Notifications */}
                                    <div className="pt-4 border-t border-border">
                                        <label className="text-sm font-medium text-white block mb-4">
                                            <Bell className="inline size-4 mr-2" />
                                            Notifications
                                        </label>
                                        <div className="space-y-3">
                                            <div className="flex items-start">
                                                <input
                                                    type="checkbox"
                                                    checked={emailNotifications}
                                                    onChange={(e) => setEmailNotifications(e.target.checked)}
                                                    className="h-4 w-4 rounded border-border bg-surface text-primary focus:ring-primary mt-1"
                                                />
                                                <div className="ml-3 text-sm">
                                                    <label className="font-medium text-white">Email Notifications</label>
                                                    <p className="text-text-muted">Get emails when you're not online.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start">
                                                <input
                                                    type="checkbox"
                                                    checked={pushNotifications}
                                                    onChange={(e) => setPushNotifications(e.target.checked)}
                                                    className="h-4 w-4 rounded border-border bg-surface text-primary focus:ring-primary mt-1"
                                                />
                                                <div className="ml-3 text-sm">
                                                    <label className="font-medium text-white">Push Notifications</label>
                                                    <p className="text-text-muted">Receive push when mentioned or assigned.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Danger Zone */}
                            <section className="glass-card rounded-2xl p-6 md:p-8 border-red-900/40 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Trash2 className="text-red-500 size-32" />
                                </div>
                                <h3 className="text-lg font-semibold text-red-500 mb-2 relative z-10 flex items-center gap-2">
                                    <Trash2 className="size-5" />
                                    Danger Zone
                                </h3>
                                <p className="text-sm text-text-muted mb-6 max-w-lg relative z-10">
                                    Once you delete your account, there is no going back. All your projects, tasks, and team associations will be permanently removed.
                                </p>
                                <button className="relative z-10 rounded-lg border border-red-900/50 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500 hover:text-white transition-all">
                                    Delete Account
                                </button>
                            </section>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
