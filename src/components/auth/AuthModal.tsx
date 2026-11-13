import React from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import type { UserProfile } from '../../types';

declare global { interface Window { firebase?: any; } }

interface AuthModalProps { isOpen: boolean; onClose: () => void; onUserChanged: (user: UserProfile) => void; }

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  const signOut = async () => {
    await window.firebase?.auth()?.signOut();
    localStorage.removeItem('maverick_current_user_v1');
    onClose();
  };
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
    <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
      <div className="mb-3 flex items-center gap-2 text-white"><ShieldCheck className="h-5 w-5 text-emerald-400"/><h2 className="font-semibold">Authenticated session</h2></div>
      <p className="text-sm text-neutral-400">Your identity and access are managed by Firebase Google Authentication.</p>
      <button onClick={signOut} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500"><LogOut className="h-4 w-4"/> Sign out</button>
      <button onClick={onClose} className="mt-2 w-full rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800">Cancel</button>
    </div>
  </div>;
};
