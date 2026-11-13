import React, { useEffect, useState } from 'react';
import { localStore } from '../../database/localStore';
import type { UserProfile } from '../../types';

declare global {
  interface Window { firebase?: any; }
}

const ADMIN_EMAIL = 'mavbharath01@gmail.com';
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

type GateState =
  | { status: 'config_missing' | 'signed_out' | 'loading' }
  | { status: 'pending'; email: string; name: string }
  | { status: 'error'; message: string }
  | { status: 'allowed'; user: UserProfile };

const configured = Object.values(config).every(Boolean);

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
    <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
      <div className="mb-6 text-center"><div className="text-2xl font-bold">Maverick AI</div><p className="mt-2 text-sm text-neutral-400">{title}</p></div>
      {children}
    </div>
  </div>;
}

export const FirebaseAuthBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GateState>({ status: configured ? 'loading' : 'config_missing' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!configured) return;
    const firebase = window.firebase;
    if (!firebase) {
      setState({ status: 'error', message: 'Firebase SDK did not load. Refresh the page or check the Firebase CDN connection.' });
      return;
    }
    try {
      const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
      const auth = app.auth();
      const db = app.firestore();
      const unsubscribe = auth.onAuthStateChanged(async (identity: any) => {
        if (!identity) { localStorage.removeItem('maverick_current_user_v1'); setState({ status: 'signed_out' }); return; }
        try {
          await identity.reload();
          if (!identity.emailVerified) {
            await auth.signOut();
            setState({ status: 'error', message: 'Please verify your Google account email and sign in again.' });
            return;
          }
          const email = String(identity.email || '').toLowerCase();
          const isAdmin = email === ADMIN_EMAIL;
          const profileRef = db.collection('users').doc(identity.uid);
          const profileSnap = await profileRef.get();
          if (!profileSnap.exists) {
            await profileRef.set({
              uid: identity.uid, email, displayName: identity.displayName || email.split('@')[0],
              photoURL: identity.photoURL || null, role: isAdmin ? 'admin' : 'candidate',
              status: isAdmin ? 'approved' : 'pending', createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
          }
          const profile = (await profileRef.get()).data();
          // Admin identity is derived from the verified Google token email, never from client-editable role data.
          if (!isAdmin && (!profile || profile.status !== 'approved' || profile.role !== 'candidate')) {
            setState({ status: 'pending', email, name: identity.displayName || email });
            return;
          }
          const user: UserProfile = {
            id: identity.uid, fullName: identity.displayName || email, email,
            role: isAdmin ? 'admin' : 'student', isApproved: true, avatarUrl: identity.photoURL || undefined,
          };
          localStore.setCurrentUser(user);
          setState({ status: 'allowed', user });
        } catch (error: any) {
          setState({ status: 'error', message: error?.message || 'Unable to verify your account access.' });
        }
      });
      return unsubscribe;
    } catch (error: any) {
      setState({ status: 'error', message: error?.message || 'Firebase initialization failed.' });
    }
  }, []);

  const signIn = async () => {
    setBusy(true);
    try {
      const auth = window.firebase?.auth();
      if (!auth) throw new Error('Firebase is not configured.');
      const provider = new window.firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await auth.signInWithPopup(provider);
    } catch (error: any) {
      setState({ status: 'error', message: error?.code === 'auth/popup-blocked' ? 'Allow pop-ups for this site and try again.' : error?.message || 'Google sign-in failed.' });
    } finally { setBusy(false); }
  };

  const signOut = async () => { await window.firebase?.auth()?.signOut(); localStorage.removeItem('maverick_current_user_v1'); setState({ status: 'signed_out' }); };

  if (state.status === 'allowed') return <>{children}</>;
  if (state.status === 'loading') return <Panel title="Checking your sign-in"><p className="text-center text-sm text-neutral-400">Verifying your Google identity and access approval…</p></Panel>;
  if (state.status === 'pending') return <Panel title="Account awaiting approval">
    <div className="rounded-xl border border-amber-700/40 bg-amber-950/30 p-4 text-sm text-amber-200">Google account <strong>{state.email}</strong> is authenticated, but access is pending approval by <strong>{ADMIN_EMAIL}</strong>.</div>
    <p className="mt-4 text-xs text-neutral-400">You can use this page again after the administrator approves your account.</p>
    <button onClick={signOut} className="mt-6 w-full rounded-xl border border-neutral-700 py-3 text-sm hover:bg-neutral-800">Sign out</button>
  </Panel>;
  return <Panel title={state.status === 'config_missing' ? 'Firebase setup required' : 'Sign in to continue'}>
    {state.status === 'config_missing' ? <>
      <p className="text-sm text-neutral-300">Authentication is mandatory, but Firebase web configuration has not been added to the deployment yet.</p>
      <p className="mt-3 text-xs text-neutral-400">Add VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID and VITE_FIREBASE_APP_ID as GitHub Actions repository variables, then redeploy.</p>
    </> : <>
      {state.status === 'error' && <p role="alert" className="mb-4 rounded-lg border border-red-800 bg-red-950/40 p-3 text-xs text-red-200">{state.message}</p>}
      <p className="mb-5 text-sm text-neutral-400">Use your Google account. Candidate accounts require administrator approval. Only {ADMIN_EMAIL} receives administrator access.</p>
      <button disabled={busy} onClick={signIn} className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-200 disabled:opacity-50">{busy ? 'Opening Google…' : 'Continue with Google'}</button>
    </>}
  </Panel>;
};
