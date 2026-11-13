/**
 * Firebase Google Authentication Modal
 * Uses Firebase Auth (signInWithPopup + GoogleAuthProvider) and Cloud Firestore user profiles.
 */

import React, { useState } from 'react';
import {
  X,
  LogOut,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../../services/firebase';
import { firestoreService } from '../../services/firestoreService';
import { localStore, DEFAULT_STUDENT_USER } from '../../database/localStore';
import { UserProfile } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserChanged: (user: UserProfile) => void;
}

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
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState('DevOps Engineer');
  const [reason, setReason] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const currentUser = localStore.getCurrentUser();
  const isFirebaseSignedIn = !!auth.currentUser;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const profile = await firestoreService.syncAuthenticatedUser(result.user);
      localStore.setCurrentUser(profile);

      await firestoreService.logActivity({
        userId: profile.id,
        userEmail: profile.email,
        userName: profile.fullName,
        action: 'login',
        description: `Signed in with Google (${profile.role === 'admin' ? 'Administrator' : 'Candidate'})`,
      });

      onUserChanged(profile);
      if (profile.role === 'admin' || profile.isApproved) {
        onClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signOut(auth);
      const guest = { ...DEFAULT_STUDENT_USER };
      localStore.setCurrentUser(guest);
      onUserChanged(guest);
      setRequestSubmitted(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sign-out failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAccessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const req = await firestoreService.submitAccessRequest({
        userId: currentUser.id,
        fullName: currentUser.fullName,
        email: currentUser.email,
        targetRole,
        reason: reason.trim() || 'Mock interview assessment cohort access request',
      });

      localStore.submitAccessRequest({
        fullName: req.fullName,
        email: req.email,
        targetRole: req.targetRole,
        reason: req.reason,
      });

      await firestoreService.logActivity({
        userId: currentUser.id,
        userEmail: currentUser.email,
        userName: currentUser.fullName,
        action: 'access_requested',
        description: `Submitted enrollment request for ${targetRole}`,
      });

      setRequestSubmitted(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit access request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-neutral-200">
              <GoogleLogoIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Google Authentication
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Firebase Auth
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Cloud Firestore synced session & interview history
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

        {/* Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="break-words">{errorMsg}</span>
            </div>
          )}

          {isFirebaseSignedIn ? (
            <div className="space-y-4">
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.fullName}
                      className="w-10 h-10 rounded-full border border-neutral-700 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
                      {currentUser.fullName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{currentUser.fullName}</div>
                    <div className="text-[11px] font-mono text-neutral-400 truncate">{currentUser.email}</div>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border shrink-0 ${
                  currentUser.role === 'admin'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : currentUser.isApproved
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                }`}>
                  {currentUser.role === 'admin' ? 'Admin' : currentUser.isApproved ? 'Approved' : 'Candidate'}
                </span>
              </div>

              {currentUser.role !== 'admin' && !currentUser.isApproved && !requestSubmitted && (
                <form onSubmit={handleSubmitAccessRequest} className="p-4 bg-neutral-950/70 border border-neutral-800 rounded-xl space-y-3">
                  <div className="text-xs font-semibold text-white">
                    Complete Candidate Track Enrollment
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Target Role</label>
                    <select
                      value={targetRole}
                      onChange={e => setTargetRole(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="DevOps Engineer">DevOps Engineer</option>
                      <option value="Site Reliability Engineer (SRE)">Site Reliability Engineer (SRE)</option>
                      <option value="Kubernetes Platform Specialist">Kubernetes Platform Specialist</option>
                      <option value="Cloud Infrastructure Architect">Cloud Infrastructure Architect</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Cohort / Notes</label>
                    <textarea
                      rows={2}
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="Optional cohort or interview track notes..."
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    {isLoading ? 'Submitting...' : 'Submit Enrollment Request'}
                  </button>
                </form>
              )}

              {requestSubmitted && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Enrollment request submitted to Firestore.</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="flex-1 py-2.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2 text-xs text-neutral-300">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Sign in with Google</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Authenticate with your Google account to save mock interview attempts, question history, and evaluation analytics to Cloud Firestore.
                </p>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-3 bg-white hover:bg-neutral-100 disabled:opacity-60 text-neutral-900 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2.5"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-700" />
                ) : (
                  <GoogleLogoIcon className="w-4 h-4" />
                )}
                <span>{isLoading ? 'Authenticating...' : 'Continue with Google'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>;
};
