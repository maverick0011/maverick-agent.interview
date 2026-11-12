import React, { useState, useEffect } from 'react';
import { MacTitleBar } from './components/common/MacTitleBar';
import { Sidebar, NavTab } from './components/common/Sidebar';
import { FloatingAssistant } from './components/copilot/FloatingAssistant';
import { ModelDoctorModal } from './components/modals/ModelDoctorModal';
import { SetupWizard } from './components/wizard/SetupWizard';
import { localStore } from './database/localStore';

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

import { AuthModal } from './components/auth/AuthModal';
import { AdminDashboardModal } from './components/admin/AdminDashboardModal';
import { UserProfile } from './types';
import { ShieldAlert, ArrowRight } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isFloatingOpen, setIsFloatingOpen] = useState(false);
  const [isDoctorOpen, setIsDoctorOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(localStore.getCurrentUser());
  const [showWizard, setShowWizard] = useState(!localStore.isWizardCompleted());

  // Listen for user changes or storage updates
  const handleUserChanged = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
  };

  // Check if opened directly in floating route (e.g. hash #/floating in Electron secondary window)
  useEffect(() => {
    if (window.location.hash === '#/floating') {
      setIsFloatingOpen(true);
    }
  }, []);

  // Keyboard shortcut listener for web preview & desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + Space: Toggle Floating HUD
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        setIsFloatingOpen(prev => !prev);
      }
      // Cmd/Ctrl + Shift + D: Model Doctor
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsDoctorOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

      {/* Account Pending Approval Banner if student is not approved */}
      {!currentUser.isApproved && currentUser.role !== 'admin' && (
        <div className="bg-amber-950/60 border-b border-amber-600/30 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Google SSO Access Pending:</strong> Your account <em>{currentUser.email}</em> is awaiting approval by administrator <strong className="text-white">mavbharath01@gmail.com</strong>.
            </span>
          </div>
          <button
            onClick={() => setIsAuthOpen(true)}
            className="flex items-center gap-1 font-semibold text-amber-300 hover:text-white underline underline-offset-2 ml-4 shrink-0"
          >
            Google SSO Options <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
            />
          )}
          {activeTab === 'copilot' && (
            <LiveCopilotPage onToggleFloating={() => setIsFloatingOpen(true)} />
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

      {/* Floating HUD Assistant Overlay */}
      {isFloatingOpen && (
        <FloatingAssistant onClose={() => setIsFloatingOpen(false)} />
      )}

      {/* Model Doctor Diagnostic Modal */}
      <ModelDoctorModal
        isOpen={isDoctorOpen}
        onClose={() => setIsDoctorOpen(false)}
      />

      {/* First Time Setup Wizard */}
      {showWizard && (
        <SetupWizard onComplete={() => setShowWizard(false)} />
      )}

      {/* User Login & Access Request Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onUserChanged={handleUserChanged}
      />

      {/* Admin Command Center (Candidate Approval & Live Proctored Feeds) */}
      <AdminDashboardModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />
    </div>
  );
}
