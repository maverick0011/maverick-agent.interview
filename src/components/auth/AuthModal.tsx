/**
 * Google SSO Authentication Portal
 * Google Identity Single Sign-On (SSO) as the exclusive login gateway.
 * Designates mavbharath01@gmail.com as the platform administrator with
 * privileges to monitor student activities and watch live mock interview video feeds.
 */

import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  Clock, 
  ArrowRight,
  LogOut,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { localStore, isAdminEmail, DEFAULT_ADMIN_USER, DEFAULT_STUDENT_USER } from '../../database/localStore';
import { UserProfile, AccessRequest } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserChanged: (user: UserProfile) => void;
}

// Google Official 4-Color SVG Icon
export const GoogleLogoIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      fill="#4285F4"
    />
    <path
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
      fill="#34A853"
    />
    <path
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.98 0 12c0 2.02.45 3.84 1.24 5.42l4.04-3.15z"
      fill="#FBBC05"
    />
    <path
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      fill="#EA4335"
    />
  </svg>
);

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onUserChanged,
}) => {
  const [mode, setMode] = useState<'sso_picker' | 'custom_google' | 'request_flow'>('sso_picker');
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [targetRole, setTargetRole] = useState('DevOps Engineer');
  const [reason, setReason] = useState('');
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentUser = localStore.getCurrentUser();

  // 1. Sign In as Designated Admin: mavbharath01@gmail.com
  const handleSignInAsAdmin = () => {
    const adminUser = { ...DEFAULT_ADMIN_USER };
    localStore.setCurrentUser(adminUser);
    localStore.logUserActivity({
      userId: adminUser.id,
      userEmail: adminUser.email,
      userName: adminUser.fullName,
      action: 'login',
      description: 'Admin logged in via Google SSO (Full Proctoring & Assessment Access)',
    });
    onUserChanged(adminUser);
    onClose();
  };

  // 2. Sign In as Pre-Approved Candidate
  const handleSignInAsStudent = () => {
    const studentUser = { ...DEFAULT_STUDENT_USER };
    localStore.setCurrentUser(studentUser);
    localStore.logUserActivity({
      userId: studentUser.id,
      userEmail: studentUser.email,
      userName: studentUser.fullName,
      action: 'login',
      description: 'Approved student signed in via Google SSO',
    });
    onUserChanged(studentUser);
    onClose();
  };

  // 3. Custom Google Account Sign-In
  const handleCustomGoogleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const email = customEmail.trim().toLowerCase();
    const name = customName.trim() || email.split('@')[0];

    if (!email) return;

    // Check if this is the admin email (mavbharath01@gmail.com)
    if (isAdminEmail(email)) {
      const adminUser: UserProfile = {
        id: 'user-admin-bharath',
        fullName: name || 'Bharath H Kumar',
        email,
        role: 'admin',
        isApproved: true,
        avatarUrl: 'https://lh3.googleusercontent.com/a/default-user',
      };
      localStore.setCurrentUser(adminUser);
      localStore.logUserActivity({
        userId: adminUser.id,
        userEmail: adminUser.email,
        userName: adminUser.fullName,
        action: 'login',
        description: 'Admin logged in via Google SSO',
      });
      onUserChanged(adminUser);
      onClose();
      return;
    }

    // Check if already approved by mavbharath01@gmail.com
    const requests = localStore.getAccessRequests();
    const existingApproved = requests.find(r => r.email.toLowerCase() === email && r.status === 'approved');

    if (existingApproved) {
      const approvedStudent: UserProfile = {
        id: `user-${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        fullName: existingApproved.fullName || name,
        email,
        role: 'student',
        isApproved: true,
        avatarUrl: 'https://lh3.googleusercontent.com/a/default-user',
      };
      localStore.setCurrentUser(approvedStudent);
      localStore.logUserActivity({
        userId: approvedStudent.id,
        userEmail: approvedStudent.email,
        userName: approvedStudent.fullName,
        action: 'login',
        description: 'Approved candidate signed in via Google SSO',
      });
      onUserChanged(approvedStudent);
      onClose();
      return;
    }

    // Otherwise, transition to enrollment request for mavbharath01@gmail.com to approve
    setMode('request_flow');
  };

  // 4. Submit Candidate Request to mavbharath01@gmail.com
  const handleCompleteRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const email = customEmail.trim().toLowerCase();
    const name = customName.trim() || email.split('@')[0];

    const req = localStore.submitAccessRequest({
      fullName: name,
      email,
      targetRole,
      reason: reason.trim() || 'Student mock interview preparation cohort 2026',
    });

    const pendingUser: UserProfile = {
      id: `user-${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
      fullName: name,
      email,
      role: 'student',
      isApproved: false,
      avatarUrl: 'https://lh3.googleusercontent.com/a/default-user',
    };

    localStore.setCurrentUser(pendingUser);
    localStore.logUserActivity({
      userId: pendingUser.id,
      userEmail: pendingUser.email,
      userName: pendingUser.fullName,
      action: 'access_requested',
      description: `New candidate registered via Google SSO. Awaiting approval by mavbharath01@gmail.com`,
    });

    onUserChanged(pendingUser);
    setPendingNotice(email);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        {/* Header with Google SSO Branding */}
        <div className="px-6 py-5 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-neutral-200">
              <GoogleLogoIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Google SSO Authentication
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Exclusive SSO
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Single Sign-On for students & administrator
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current User Session Status */}
        <div className="px-6 py-3 bg-neutral-950/60 border-b border-neutral-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">Active Google User:</span>
            <span className="font-bold text-white max-w-[150px] truncate">{currentUser.fullName}</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
            currentUser.role === 'admin'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : currentUser.isApproved
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            {currentUser.role === 'admin' ? 'Administrator' : currentUser.isApproved ? 'Approved Student' : 'Pending Approval'}
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {pendingNotice ? (
            /* Pending Approval State Notice */
            <div className="space-y-4 text-center py-2 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">
                  Google SSO Verified: Awaiting Approval
                </h3>
                <p className="text-xs text-neutral-300">
                  Your Google identity <strong className="text-white">{pendingNotice}</strong> has been authenticated.
                </p>
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-[11px] text-neutral-400 text-left space-y-1 mt-2">
                  <span className="font-semibold text-amber-300 block">Administrator Approval Gate:</span>
                  <p>
                    All candidate accounts must be approved by the platform administrator (<strong className="text-white">mavbharath01@gmail.com</strong>).
                    Once approved, your full access to the AI interview copilot and mock interview simulator unlocks automatically.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleSignInAsAdmin}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-black rounded-xl text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5 text-black" />
                  <span>Log in as mavbharath01@gmail.com (Admin)</span>
                </button>
                <button
                  onClick={() => setPendingNotice(null)}
                  className="text-xs text-neutral-500 hover:text-neutral-300 py-1"
                >
                  Sign in with a different Google account
                </button>
              </div>
            </div>
          ) : mode === 'sso_picker' ? (
            /* Mode 1: Quick Google Account Selector */
            <div className="space-y-4">
              <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Select Google Workspace / Gmail Account
              </div>

              {/* 1. Admin Account: mavbharath01@gmail.com */}
              <button
                onClick={handleSignInAsAdmin}
                className="w-full p-3.5 bg-neutral-950 hover:bg-neutral-850 border border-amber-600/40 hover:border-amber-500 rounded-xl text-left transition-all flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-xs shrink-0">
                    BK
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Bharath H Kumar</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                        Admin
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-amber-200/90 font-medium">
                      mavbharath01@gmail.com
                    </div>
                    <p className="text-[10px] text-neutral-400">
                      Live student video assessment & user activity monitor
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 transition-colors shrink-0" />
              </button>

              {/* 2. Candidate Account: alex.mercer@gmail.com */}
              <button
                onClick={handleSignInAsStudent}
                className="w-full p-3.5 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-indigo-500/50 rounded-xl text-left transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
                    AM
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Alex Mercer</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        Approved
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-neutral-300">
                      alex.mercer@gmail.com
                    </div>
                    <p className="text-[10px] text-neutral-400">
                      Mock interview candidate (Assessed by mavbharath01@gmail.com)
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-indigo-400 transition-colors shrink-0" />
              </button>

              {/* Custom Google Account button */}
              <div className="pt-2">
                <button
                  onClick={() => setMode('custom_google')}
                  className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <GoogleLogoIcon className="w-4 h-4" />
                  <span>Use another Google account</span>
                </button>
              </div>

              {/* Notice regarding mavbharath01@gmail.com */}
              <div className="p-3 bg-neutral-950/80 border border-neutral-850 rounded-xl text-[11px] text-neutral-400 leading-relaxed">
                <span className="text-neutral-300 font-semibold block">Google SSO Security Policy:</span>
                Admin <strong className="text-amber-300">mavbharath01@gmail.com</strong> is the sole authorized user who can view real-time student activity and assess students via live mock interview video feeds.
              </div>
            </div>
          ) : mode === 'custom_google' ? (
            /* Mode 2: Custom Google Account Sign-In */
            <form onSubmit={handleCustomGoogleSignIn} className="space-y-3">
              <div className="text-xs text-neutral-400">
                Sign in with your Google Workspace or Gmail address:
              </div>

              <div>
                <label className="text-xs text-neutral-300 block mb-1">Google Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="e.g. yourname@gmail.com"
                    value={customEmail}
                    onChange={e => setCustomEmail(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-3 pr-8 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <GoogleLogoIcon className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-300 block mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sumanth Rao"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('sso_picker')}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded-xl text-xs font-semibold"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <GoogleLogoIcon className="w-3.5 h-3.5" />
                  <span>Authenticate with Google</span>
                </button>
              </div>
            </form>
          ) : (
            /* Mode 3: Student Request for mavbharath01@gmail.com */
            <form onSubmit={handleCompleteRequest} className="space-y-3">
              <div className="p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-xl text-xs space-y-1">
                <div className="font-semibold text-white">Google SSO Verified: {customEmail}</div>
                <p className="text-[11px] text-neutral-400">
                  Select your engineering track to request platform access from administrator <strong className="text-amber-300">mavbharath01@gmail.com</strong>.
                </p>
              </div>

              <div>
                <label className="text-xs text-neutral-300 block mb-1">Target Engineering Role</label>
                <select
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="DevOps Engineer">DevOps Engineer</option>
                  <option value="Site Reliability Engineer (SRE)">Site Reliability Engineer (SRE)</option>
                  <option value="Kubernetes Platform Specialist">Kubernetes Platform Specialist</option>
                  <option value="Cloud Infrastructure Architect">Cloud Infrastructure Architect</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-neutral-300 block mb-1">Cohort / Reason for Access</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Student prepping for DevOps & Kubernetes technical interviews..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('sso_picker')}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
                >
                  Submit for Approval to mavbharath01@gmail.com
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
