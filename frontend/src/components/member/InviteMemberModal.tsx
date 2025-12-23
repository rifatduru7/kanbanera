import { useState } from 'react';
import { X, Loader2, Mail, UserPlus, Copy, Check } from 'lucide-react';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId?: string;
    projectName?: string;
}

const ROLE_OPTIONS = [
    { value: 'member', label: 'Member', description: 'Can view, create, and edit tasks' },
    { value: 'admin', label: 'Admin', description: 'Full access to project settings' },
    { value: 'viewer', label: 'Viewer', description: 'Can only view tasks and comments' },
];

export function InviteMemberModal({ isOpen, onClose, projectName = 'this project' }: InviteMemberModalProps) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('member');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [copied, setCopied] = useState(false);

    // Mock invite link
    const inviteLink = `https://era.rifatduru.com.tr/invite/abc123xyz`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) return;

        setIsSubmitting(true);

        // TODO: Implement actual invite API
        // For now, simulate API call
        setTimeout(() => {
            setIsSubmitting(false);
            setIsSuccess(true);

            setTimeout(() => {
                setEmail('');
                setIsSuccess(false);
                onClose();
            }, 1500);
        }, 1000);
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            console.error('Failed to copy');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all duration-300">
            {/* Modal Card */}
            <div className="relative w-full max-w-[480px] flex flex-col rounded-xl border border-white/10 bg-surface/95 backdrop-blur-md shadow-[0_0_40px_-10px_rgba(19,185,165,0.15)] ring-1 ring-white/5 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <UserPlus className="size-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-white text-xl font-bold tracking-tight">Invite Team Member</h2>
                            <p className="text-text-muted text-sm">Add someone to {projectName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="group text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Success State */}
                {isSuccess ? (
                    <div className="p-6 flex flex-col items-center justify-center py-12">
                        <div className="size-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                            <Check className="size-8 text-green-500" />
                        </div>
                        <h3 className="text-white text-lg font-semibold mb-2">Invitation Sent!</h3>
                        <p className="text-text-muted text-center">
                            An invite has been sent to <span className="text-primary">{email}</span>
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Form Content */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Email Input */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    Email Address <span className="text-primary">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="size-5 text-text-muted" />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full rounded-lg bg-background/50 border border-border text-white placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary h-12 pl-12 pr-4 text-base transition-colors"
                                        placeholder="colleague@company.com"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Role Selection */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-slate-300">Role</label>
                                <div className="space-y-2">
                                    {ROLE_OPTIONS.map((opt) => (
                                        <label
                                            key={opt.value}
                                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                                                ${role === opt.value
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-border bg-background/30 hover:border-white/20'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="role"
                                                value={opt.value}
                                                checked={role === opt.value}
                                                onChange={(e) => setRole(e.target.value)}
                                                className="mt-1 text-primary focus:ring-primary"
                                            />
                                            <div>
                                                <p className="text-white font-medium text-sm">{opt.label}</p>
                                                <p className="text-text-muted text-xs">{opt.description}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-4 pt-2">
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-text-muted text-xs uppercase tracking-wider">or share link</span>
                                <div className="flex-1 h-px bg-border" />
                            </div>

                            {/* Copy Link */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={inviteLink}
                                    readOnly
                                    className="flex-1 rounded-lg bg-background/50 border border-border text-text-muted h-12 px-4 text-sm truncate"
                                />
                                <button
                                    type="button"
                                    onClick={handleCopyLink}
                                    className={`px-4 rounded-lg border transition-all flex items-center gap-2 ${copied
                                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                            : 'border-border text-slate-300 hover:bg-white/5'
                                        }`}
                                >
                                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-white/5 bg-background/20">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all focus:outline-none"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !email.trim()}
                                className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-primary text-background hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary transition-all shadow-md shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                                Send Invitation
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
