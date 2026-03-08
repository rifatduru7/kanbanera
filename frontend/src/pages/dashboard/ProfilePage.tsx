import { useEffect, useMemo, useState } from 'react';
import {
    User,
    EnvelopeSimple as Mail,
    LockKey as Lock,
    Moon,
    Sun,
    Desktop as Monitor,
    Bell,
    Trash as Trash2,
    ShieldCheck as Shield,
    CircleNotch as Loader2,
    Check,
    Globe,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, type AppUser } from '../../stores/authStore';
import { useTheme, type Theme } from '../../hooks/useTheme';
import { authApi, usersApi } from '../../lib/api/client';
import { toast } from 'react-hot-toast';

export function ProfilePage() {
    const { user, setUser, logout } = useAuthStore();
    const { theme, setTheme } = useTheme();
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

    const nameParts = useMemo(() => (user?.fullName || '').trim().split(/\s+/).filter(Boolean), [user?.fullName]);
    const [firstName, setFirstName] = useState(nameParts[0] || '');
    const [lastName, setLastName] = useState(nameParts.slice(1).join(' '));

    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(true);
    const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
    const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

    // 2FA States
    const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
    const [isEnabling2FA, setIsEnabling2FA] = useState(false);
    const [show2FASetup, setShow2FASetup] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [mfaSetupData, setMfaSetupData] = useState<{ qrCode: string; secret: string } | null>(null);
    const [showDeleteForm, setShowDeleteForm] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

    const toAppUser = (value: unknown): AppUser | null => {
        if (!value || typeof value !== 'object') return null;
        const raw = value as Record<string, unknown>;
        const id = typeof raw.id === 'string' ? raw.id : '';
        const email = typeof raw.email === 'string' ? raw.email : '';
        const fullName = typeof raw.full_name === 'string'
            ? raw.full_name
            : typeof raw.fullName === 'string'
                ? raw.fullName
                : '';
        if (!id || !email || !fullName) return null;

        const role = raw.role === 'admin' ? 'admin' : 'member';
        const avatarUrl = typeof raw.avatar_url === 'string'
            ? raw.avatar_url
            : typeof raw.avatarUrl === 'string'
                ? raw.avatarUrl
                : undefined;
        const twoFactorEnabled = raw.two_factor_enabled === 1 || raw.twoFactorEnabled === true;

        return {
            id,
            email,
            fullName,
            avatarUrl,
            role,
            twoFactorEnabled,
        };
    };

    useEffect(() => {
        const loadPreferences = async () => {
            if (!user) return;
            setIsLoadingPreferences(true);
            try {
                const response = await usersApi.getMyPreferences();
                if (response.success && response.data) {
                    setEmailNotifications(response.data.preferences.email_notifications);
                    setPushNotifications(response.data.preferences.push_notifications);
                }
            } catch {
                toast.error(t('profile.preferences_load_failed', 'Failed to load notification preferences'));
            } finally {
                setIsLoadingPreferences(false);
            }
        };

        loadPreferences();
    }, [user, t]);

    const updateNotificationPreferences = async (updates: {
        email_notifications?: boolean;
        push_notifications?: boolean;
    }) => {
        setIsUpdatingPreferences(true);
        try {
            const response = await usersApi.updateMyPreferences(updates);
            if (!response.success || !response.data) {
                toast.error(response.message || t('profile.preferences_update_failed', 'Failed to update notification preferences'));
                return false;
            }

            setEmailNotifications(response.data.preferences.email_notifications);
            setPushNotifications(response.data.preferences.push_notifications);
            return true;
        } catch {
            toast.error(t('profile.preferences_update_failed', 'Failed to update notification preferences'));
            return false;
        } finally {
            setIsUpdatingPreferences(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
            toast.error(t('profile.delete_confirm_mismatch', 'Please type DELETE to confirm'));
            return;
        }
        if (!deletePassword) {
            toast.error(t('profile.password_required', 'Password is required'));
            return;
        }

        setIsDeletingAccount(true);
        try {
            const response = await usersApi.deleteMyAccount({
                password: deletePassword,
                confirmText: deleteConfirmText,
            });
            if (!response.success) {
                toast.error(response.message || t('profile.delete_failed', 'Failed to delete account'));
                return;
            }

            logout();
            toast.success(t('profile.delete_success', 'Your account has been deleted'));
            navigate('/login');
        } catch {
            toast.error(t('profile.delete_failed', 'Failed to delete account'));
        } finally {
            setIsDeletingAccount(false);
        }
    };

    const handleSetup2FA = async () => {
        setIsSettingUp2FA(true);
        try {
            const response = await authApi.setup2FA();
            if (response.success && response.data) {
                setMfaSetupData(response.data);
                setShow2FASetup(true);
            } else {
                toast.error(response.message || 'Failed to setup 2FA');
            }
        } catch {
            toast.error('Failed to setup 2FA');
        } finally {
            setIsSettingUp2FA(false);
        }
    };

    const handleVerifyAndEnable2FA = async () => {
        if (twoFactorCode.length !== 6 || !mfaSetupData) return;
        setIsEnabling2FA(true);
        try {
            const response = await authApi.enable2FA(mfaSetupData.secret, twoFactorCode);
            if (response.success && response.data) {
                setUser(toAppUser(response.data.user));
                setShow2FASetup(false);
                setTwoFactorCode('');
                toast.success(t('profile.2fa_enabled_success'));
            } else {
                toast.error(response.message || 'Invalid verification code');
            }
        } catch {
            toast.error('Failed to enable 2FA');
        } finally {
            setIsEnabling2FA(false);
        }
    };

    const handleDisable2FA = async (code: string) => {
        try {
            const response = await authApi.disable2FA(code);
            if (response.success && response.data) {
                setUser(toAppUser(response.data.user));
                toast.success(t('profile.2fa_disabled_success'));
            } else {
                toast.error(response.message || 'Failed to disable 2FA');
            }
        } catch {
            toast.error('Failed to disable 2FA');
        }
    };



    const handleSaveChanges = async () => {
        if (!user) return;

        setIsSaving(true);
        setSaveSuccess(false);

        try {
            const fullName = `${firstName} ${lastName}`.trim();
            const response = await authApi.updateProfile({ full_name: fullName });

            if (response.success && response.data) {
                setUser(response.data.user);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            } else {
                toast.error(response.message || t('profile.update_failed'));
            }
        } catch {
            toast.error(t('profile.update_failed'));
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = async (event: React.FormEvent) => {
        event.preventDefault();

        if (passwords.new !== passwords.confirm) {
            toast.error(t('profile.not_match'));
            return;
        }

        if (passwords.new.length < 8) {
            toast.error(t('profile.too_short'));
            return;
        }

        setIsChangingPassword(true);
        try {
            const response = await authApi.changePassword({
                currentPassword: passwords.current,
                newPassword: passwords.new,
            });

            if (response.success) {
                toast.success(t('profile.pass_success'));
                setShowPasswordForm(false);
                setPasswords({ current: '', new: '', confirm: '' });
            } else {
                toast.error(response.message || t('profile.pass_failed'));
            }
        } catch {
            toast.error(t('profile.pass_error'));
        } finally {
            setIsChangingPassword(false);
        }
    };

    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim() || user?.fullName?.charAt(0) || 'U';

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <header className="flex-shrink-0 px-6 py-6 border-b border-border">
                <div className="flex items-center gap-3">
                    <User className="size-8 text-primary" />
                    <div>
                        <h2 className="text-3xl font-bold text-text tracking-tight">{t('profile.title')}</h2>
                        <p className="text-text-muted text-sm">{t('profile.subtitle')}</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-6 lg:p-10">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-4 lg:sticky lg:top-6">
                        <div className="glass-card rounded-2xl p-6 flex flex-col items-center text-center shadow-xl">
                            <div className="size-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center text-primary text-3xl font-bold border-4 border-surface shadow-lg mb-5">
                                {initials.toUpperCase()}
                            </div>

                            <h3 className="text-xl font-bold text-text">{firstName} {lastName}</h3>
                            <div className="flex items-center justify-center gap-1.5 mt-1 text-text-muted text-sm">
                                <Lock className="size-4" />
                                <span>{user?.email || '-'}</span>
                            </div>

                            <div className="mt-5 flex gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary ring-1 ring-inset ring-primary/20">
                                    <span className="size-1.5 rounded-full bg-primary" />
                                    {user?.role || 'member'}
                                </span>
                            </div>

                            <div className="mt-8 pt-6 border-t border-border w-full">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-text-muted">{t('profile.last_active')}</span>
                                    <span className="text-text font-medium">{t('profile.just_now')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-8 flex flex-col gap-8">
                        <section className="glass-card rounded-2xl p-6 md:p-8">
                            <h3 className="text-lg font-semibold text-text mb-6">{t('profile.personal_info')}</h3>

                            <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-text-muted">{t('profile.first_name')}</label>
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(event) => setFirstName(event.target.value)}
                                            className="glass-input w-full p-2.5 rounded-lg"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-text-muted">{t('profile.last_name')}</label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(event) => setLastName(event.target.value)}
                                            className="glass-input w-full p-2.5 rounded-lg"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-text-muted">{t('profile.email')}</label>
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted size-5" />
                                        <input
                                            type="email"
                                            value={user?.email || ''}
                                            disabled
                                            className="glass-input w-full py-2.5 pl-10 pr-10 rounded-lg text-text-muted cursor-not-allowed"
                                        />
                                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted size-4" />
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3 items-center">
                                    {saveSuccess ? (
                                        <span className="text-green-400 text-sm flex items-center gap-1">
                                            <Check className="size-4" />
                                            {t('profile.saved')}
                                        </span>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={handleSaveChanges}
                                        disabled={isSaving}
                                        className="btn-primary py-2.5 px-6 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-70"
                                    >
                                        {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                                        {isSaving ? t('profile.saving') : t('common.save_changes')}
                                    </button>
                                </div>
                            </form>
                        </section>

                        <section className="glass-card rounded-2xl p-6 md:p-8">
                            <h3 className="text-lg font-semibold text-text mb-6 flex items-center gap-2">
                                <Shield className="size-5 text-primary" />
                                {t('profile.security')}
                            </h3>

                            <div className="space-y-6">
                                {/* Password Section */}
                                <div className="pb-6 border-b border-border">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-medium text-text">{t('profile.password')}</h4>
                                            <p className="text-sm text-text-muted mt-1">{t('profile.password_desc')}</p>
                                        </div>
                                        {!showPasswordForm && (
                                            <button
                                                onClick={() => setShowPasswordForm(true)}
                                                className="rounded-lg border border-border bg-transparent px-4 py-2 text-sm font-medium text-text hover:bg-surface-alt"
                                            >
                                                {t('profile.change_password')}
                                            </button>
                                        )}
                                    </div>

                                    {showPasswordForm && (
                                        <form onSubmit={handlePasswordChange} className="space-y-4 mt-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <input
                                                    type="password"
                                                    required
                                                    value={passwords.current}
                                                    onChange={(event) => setPasswords({ ...passwords, current: event.target.value })}
                                                    className="glass-input w-full p-2 rounded-lg text-sm"
                                                    placeholder={t('profile.current_password')}
                                                />
                                                <input
                                                    type="password"
                                                    required
                                                    value={passwords.new}
                                                    onChange={(event) => setPasswords({ ...passwords, new: event.target.value })}
                                                    className="glass-input w-full p-2 rounded-lg text-sm"
                                                    placeholder={t('profile.new_password')}
                                                />
                                                <input
                                                    type="password"
                                                    required
                                                    value={passwords.confirm}
                                                    onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })}
                                                    className="glass-input w-full p-2 rounded-lg text-sm"
                                                    placeholder={t('profile.confirm_password')}
                                                />
                                            </div>
                                            <div className="flex justify-end gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswordForm(false)}
                                                    className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text"
                                                >
                                                    {t('common.cancel')}
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={isChangingPassword}
                                                    className="btn-primary py-2 px-5 rounded-lg font-semibold text-sm flex items-center gap-2 disabled:opacity-70"
                                                >
                                                    {isChangingPassword ? <Loader2 className="size-4 animate-spin" /> : null}
                                                    {t('profile.update_password')}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>

                                {/* 2FA Section */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-medium text-text">{t('profile.two_factor')}</h4>
                                            <p className="text-sm text-text-muted mt-1">
                                                {user?.twoFactorEnabled
                                                    ? t('profile.two_factor_enabled_desc')
                                                    : t('profile.two_factor_disabled_desc')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {user?.twoFactorEnabled ? (
                                                <button
                                                    onClick={() => {
                                                        const code = window.prompt(t('profile.enter_2fa_to_disable'));
                                                        if (code) handleDisable2FA(code);
                                                    }}
                                                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20"
                                                >
                                                    {t('profile.disable')}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleSetup2FA}
                                                    disabled={isSettingUp2FA}
                                                    className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 flex items-center gap-2"
                                                >
                                                    {isSettingUp2FA && <Loader2 className="size-4 animate-spin" />}
                                                    {t('profile.enable')}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* 2FA Setup Form */}
                                    {show2FASetup && (
                                        <div className="mt-6 p-6 rounded-xl border border-border bg-surface-alt/50 space-y-6 animate-in fade-in slide-in-from-top-4">
                                            <div className="flex flex-col md:flex-row gap-8 items-center">
                                                <div className="flex-shrink-0 bg-white p-3 rounded-xl shadow-lg">
                                                    {mfaSetupData?.qrCode && (
                                                        <img
                                                            src={mfaSetupData.qrCode}
                                                            alt="2FA QR Code"
                                                            className="size-40"
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-4">
                                                    <h5 className="font-bold text-text">{t('profile.scan_qr')}</h5>
                                                    <p className="text-sm text-text-muted leading-relaxed">
                                                        {t('profile.scan_qr_desc')}
                                                    </p>
                                                    <div className="p-3 bg-surface rounded-lg border border-border flex items-center justify-between">
                                                        <code className="text-xs font-mono text-primary font-bold">{mfaSetupData?.secret}</code>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(mfaSetupData?.secret || '');
                                                                toast.success(t('common.copied'));
                                                            }}
                                                            className="text-xs text-text-muted hover:text-text"
                                                        >
                                                            {t('common.copy')}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-border">
                                                <label className="text-sm font-medium text-text mb-2 block">{t('profile.enter_verify_code')}</label>
                                                <div className="flex gap-3">
                                                    <input
                                                        type="text"
                                                        value={twoFactorCode}
                                                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                                        className="glass-input flex-1 p-2.5 rounded-lg text-center text-xl font-mono tracking-widest"
                                                        placeholder="000000"
                                                        maxLength={6}
                                                    />
                                                    <button
                                                        onClick={handleVerifyAndEnable2FA}
                                                        disabled={isEnabling2FA || twoFactorCode.length !== 6}
                                                        className="btn-primary px-6 rounded-lg font-bold text-sm flex items-center gap-2 whitespace-nowrap"
                                                    >
                                                        {isEnabling2FA && <Loader2 className="size-4 animate-spin" />}
                                                        {t('profile.verify_enable')}
                                                    </button>
                                                    <button
                                                        onClick={() => setShow2FASetup(false)}
                                                        className="px-4 py-2 text-sm text-text-muted hover:text-text"
                                                    >
                                                        {t('common.cancel')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section className="glass-card rounded-2xl p-6 md:p-8">
                            <h3 className="text-lg font-semibold text-text mb-6">{t('profile.preferences')}</h3>

                            <div className="space-y-6">
                                <div className="flex flex-col gap-3">
                                    <label className="text-sm font-medium text-text">{t('profile.theme')}</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { value: 'light', icon: Sun, label: t('profile.themes.light') },
                                            { value: 'dark', icon: Moon, label: t('profile.themes.dark') },
                                            { value: 'system', icon: Monitor, label: t('profile.themes.system') },
                                        ].map((option) => {
                                            const Icon = option.icon;
                                            const isActive = theme === option.value;
                                            return (
                                                <button
                                                    key={option.value}
                                                    onClick={() => setTheme(option.value as Theme)}
                                                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                                                        ? 'border-primary bg-primary/10 text-primary'
                                                        : 'border-border bg-surface text-text-muted hover:bg-surface-alt hover:text-text'
                                                        }`}
                                                >
                                                    <Icon className="size-4" />
                                                    {option.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 pt-4 border-t border-border">
                                    <div className="flex items-center gap-2">
                                        <Globe className="size-4 text-primary" />
                                        <label className="text-sm font-medium text-text">{t('profile.language')}</label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { value: 'en', label: 'English', flag: 'US' },
                                            { value: 'tr', label: 'Türkçe', flag: 'TR' },
                                        ].map((option) => {
                                            const isActive = i18n.language.startsWith(option.value);
                                            return (
                                                <button
                                                    key={option.value}
                                                    onClick={() => i18n.changeLanguage(option.value)}
                                                    className={`flex items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${isActive
                                                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                                        : 'border-border bg-surface text-text-muted hover:border-border-muted hover:bg-surface-alt hover:text-text'
                                                        }`}
                                                >
                                                    <span className="flex items-center gap-3">
                                                        <span className="text-xs uppercase tracking-wide">{option.flag}</span>
                                                        {option.label}
                                                    </span>
                                                    {isActive ? <div className="size-1.5 rounded-full bg-primary animate-pulse" /> : null}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border">
                                    <label className="text-sm font-medium text-text block mb-4">
                                        <Bell className="inline size-4 mr-2" />
                                        {t('profile.notifications')}
                                    </label>
                                    <div className="space-y-3 text-sm text-text-muted">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={emailNotifications}
                                                disabled={isLoadingPreferences || isUpdatingPreferences}
                                                onChange={async (event) => {
                                                    const prev = emailNotifications;
                                                    const next = event.target.checked;
                                                    setEmailNotifications(next);
                                                    const ok = await updateNotificationPreferences({ email_notifications: next });
                                                    if (!ok) setEmailNotifications(prev);
                                                }}
                                                className="h-4 w-4"
                                            />
                                            <span>{t('profile.notifications_email')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={pushNotifications}
                                                disabled={isLoadingPreferences || isUpdatingPreferences}
                                                onChange={async (event) => {
                                                    const prev = pushNotifications;
                                                    const next = event.target.checked;
                                                    setPushNotifications(next);
                                                    const ok = await updateNotificationPreferences({ push_notifications: next });
                                                    if (!ok) setPushNotifications(prev);
                                                }}
                                                className="h-4 w-4"
                                            />
                                            <span>{t('profile.notifications_push')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="glass-card rounded-2xl p-6 md:p-8 border-red-900/40">
                            <h3 className="text-lg font-semibold text-red-500 mb-2 flex items-center gap-2">
                                <Trash2 className="size-5" />
                                {t('profile.danger_zone')}
                            </h3>
                            <p className="text-sm text-text-muted mb-6 max-w-lg">
                                {t('profile.danger_zone_desc')}
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowDeleteForm((prev) => !prev)}
                                className="rounded-lg border border-red-900/50 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/20"
                            >
                                {t('profile.delete_account')}
                            </button>
                            {showDeleteForm && (
                                <div className="mt-5 grid gap-3 max-w-lg">
                                    <input
                                        type="password"
                                        value={deletePassword}
                                        onChange={(event) => setDeletePassword(event.target.value)}
                                        placeholder={t('profile.current_password')}
                                        className="glass-input w-full p-2.5 rounded-lg"
                                    />
                                    <input
                                        type="text"
                                        value={deleteConfirmText}
                                        onChange={(event) => setDeleteConfirmText(event.target.value)}
                                        placeholder={t('profile.delete_confirm_placeholder', 'Type DELETE to confirm')}
                                        className="glass-input w-full p-2.5 rounded-lg"
                                    />
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={handleDeleteAccount}
                                            disabled={isDeletingAccount}
                                            className="rounded-lg border border-red-900/50 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                                        >
                                            {isDeletingAccount ? t('common.deleting', 'Deleting...') : t('profile.delete_account')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowDeleteForm(false);
                                                setDeletePassword('');
                                                setDeleteConfirmText('');
                                            }}
                                            className="px-3 py-2 text-sm text-text-muted hover:text-text"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
