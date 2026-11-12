import React from 'react';
import {
  LayoutDashboard,
  Radio,
  BookOpen,
  UserCheck,
  Network,
  Code2,
  FileText,
  Database,
  History,
  Cpu,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'copilot'
  | 'prep'
  | 'mock'
  | 'system-design'
  | 'coding'
  | 'resume'
  | 'knowledge'
  | 'history'
  | 'models'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'copilot', label: 'Live Copilot', icon: Radio },
    { id: 'prep', label: 'Interview Prep', icon: BookOpen },
    { id: 'mock', label: 'Mock Interview', icon: UserCheck },
    { id: 'system-design', label: 'System Design', icon: Network },
    { id: 'coding', label: 'Coding Assistant', icon: Code2 },
    { id: 'resume', label: 'Resume Intelligence', icon: FileText },
    { id: 'knowledge', label: 'Knowledge Base', icon: Database },
    { id: 'history', label: 'Meeting History', icon: History },
    { id: 'models', label: 'AI Models', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`bg-neutral-950 border-r border-neutral-800/80 flex flex-col justify-between transition-all duration-200 select-none z-20 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Navigation Links */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-4 px-2">
          {!collapsed && (
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
              Workspace
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-md transition-colors ml-auto"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                  isActive
                    ? 'bg-neutral-850 text-white shadow-sm font-semibold border border-neutral-700/60'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-neutral-400'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Local Privacy Seal */}
      <div className="p-3 border-t border-neutral-800/80">
        <div className="px-2 py-2 rounded-lg bg-neutral-900/60 border border-neutral-800/60 text-neutral-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            {!collapsed && (
              <div className="text-[11px] leading-tight">
                <div className="text-neutral-300 font-medium">100% Local Processing</div>
                <div className="text-neutral-400">Zero Cloud Ingress</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
