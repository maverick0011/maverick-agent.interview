import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { MacTitleBar } from './components/common/MacTitleBar';
import { Sidebar, NavTab } from './components/common/Sidebar';
import { FloatingAssistant } from './components/copilot/FloatingAssistant';
import { CreateSessionModal } from './components/copilot/CreateSessionModal';
import { ModelDoctorModal } from './components/modals/ModelDoctorModal';
import { SetupWizard } from './components/wizard/SetupWizard';
import { localStore, DEFAULT_STUDENT_USER } from './database/localStore';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { LiveCopilotPage } from './pages/LiveCopilotPage';
import { InterviewPrepPage } from './pages/InterviewPrepPage';
import { MockInterviewPage } from './pages/MockInterviewPage';
import { SystemDesignPage } from './pages/SystemDesignPage';
import { CodingAssistantPage } from './pages/CodingAssistantPage';
import { ResumeIntelligencePage } from './pages/ResumeIntelligencePage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { MeetingHistoryPage } from './pages/MeetingHistoryPage';
import { AIModelsPage } from './pages/AIModelsPage';
import { SettingsPage } from './pages/SettingsPage';

import { SignInPage } from './components/auth/SignInPage';
import { AuthModal } from './components/auth/AuthModal';
import { AdminDashboardModal } from './components/admin/AdminDashboardModal';
import { UserProfile } from './types';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import { firestoreService } from './services/firestoreService';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
  const [isDoctorOpen, setIsDoctorOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(localStore.getCurrentUser());
  const [showWizard, setShowWizard] = useState(false);

  // Listen for Firebase Auth state changes and sync Firestore profile + route path
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser) {
        setIsAuthenticated(false);
        const guest = { ...DEFAULT_STUDENT_USER };
        localStore.setCurrentUser(guest);
        setCurrentUser(guest);
        setAuthReady(true);

        if (window.location.pathname !== '/auth/signin') {
          window.history.replaceState(null, '', '/auth/signin?callbackUrl=/dashboard');
        }
        return;
      }

      setIsAuthenticated(true);
      if (window.location.pathname === '/auth/signin' || window.location.pathname === '/') {
        window.history.replaceState(null, '', '/dashboard');
      }

      try {
        const synced = await firestoreService.syncAuthenticatedUser(firebaseUser);
        localStore.setCurrentUser(synced);
        setCurrentUser(synced);

        const remoteSettings = await firestoreService.getInterviewSettings();
        if (remoteSettings) {
          localStore.updateInterviewSettings(remoteSettings);
        }
      } catch (err) {
        console.warn('Auth sync notice:', err);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUserChanged = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
    if (!auth.currentUser) {
      setIsAuthenticated(false);
      setIsAuthOpen(false);
    }
  };

  // Check if opened directly in floating route
  useEffect(() => {
    if (window.location.hash === '#/floating') {
      setIsFloatingOpen(true);
    }
  }, []);

  // Keyboard shortcut listener for web preview & desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isAuthenticated) return;
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        setIsFloatingOpen(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsDoctorOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

  if (!authReady) {
    return (
      <div className="h-screen w-screen bg-neutral-950 text-neutral-200 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        <p className="text-xs font-medium text-neutral-400">
          Restoring your Maverick AI session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <SignInPage
        onSignedIn={profile => {
          setCurrentUser(profile);
          setIsAuthenticated(true);
          setActiveTab('dashboard');
          window.history.replaceState(null, '', '/dashboard');
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans">
      {/* Native Window TitleBar */}
      <MacTitleBar
        onToggleFloating={() => setIsFloatingOpen(prev => !prev)}
        onOpenModelDoctor={() => setIsDoctorOpen(true)}
        onOpenWizard={() => setShowWizard(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isFloatingOpen={isFloatingOpen}
        currentUser={currentUser}
      />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={tab => setActiveTab(tab)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        />

        {/* Viewport Area */}
        <main className="flex-1 overflow-y-auto bg-neutral-950/80">
          {activeTab === 'dashboard' && (
            <DashboardPage
              onNavigate={tab => setActiveTab(tab)}
              onOpenModelDoctor={() => setIsDoctorOpen(true)}
              onToggleFloating={() => setIsFloatingOpen(true)}
              onOpenCreateSession={() => setIsCreateSessionOpen(true)}
            />
          )}
          {activeTab === 'copilot' && (
            <LiveCopilotPage
              onToggleFloating={() => setIsFloatingOpen(true)}
              onOpenCreateSession={() => setIsCreateSessionOpen(true)}
            />
          )}
          {activeTab === 'prep' && <InterviewPrepPage />}
          {activeTab === 'mock' && <MockInterviewPage />}
          {activeTab === 'system-design' && <SystemDesignPage />}
          {activeTab === 'coding' && <CodingAssistantPage />}
          {activeTab === 'resume' && <ResumeIntelligencePage />}
          {activeTab === 'knowledge' && <KnowledgeBasePage />}
          {activeTab === 'history' && <MeetingHistoryPage />}
          {activeTab === 'models' && (
            <AIModelsPage onOpenModelDoctor={() => setIsDoctorOpen(true)} />
          )}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Create Session Configurator Modal */}
      <CreateSessionModal
        isOpen={isCreateSessionOpen}
        onClose={() => setIsCreateSessionOpen(false)}
        onLaunchCopilot={openHud => {
          setActiveTab('copilot');
          if (openHud) setIsFloatingOpen(true);
        }}
      />

      {/* Floating HUD Assistant Overlay */}
      {isFloatingOpen && (
        <FloatingAssistant onClose={() => setIsFloatingOpen(false)} />
      )}

      {/* Model Doctor Diagnostic Modal */}
      <ModelDoctorModal
        isOpen={isDoctorOpen}
        onClose={() => setIsDoctorOpen(false)}
      />

      {/* Setup Wizard (Manual Trigger) */}
      {showWizard && (
        <SetupWizard onComplete={() => setShowWizard(false)} />
      )}

      {/* User Login & Access Request Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onUserChanged={handleUserChanged}
      />

      {/* Admin Command Center */}
      <AdminDashboardModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />
    </div>
  );
}
