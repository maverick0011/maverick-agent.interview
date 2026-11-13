import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  UserCheck,
  Video,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Volume2,
  Award,
  Download,
  Sliders,
  Activity,
  Save,
  Check,
  TrendingUp,
} from 'lucide-react';
import { localStore, UserActivityLog } from '../../database/localStore';
import { firestoreService } from '../../services/firestoreService';
import { TOOL_TOPICS } from '../../features/mock-interview/services/questionBank';
import {
  AccessRequest,
  ProctoredLiveFeed,
  InterviewAttempt,
  UserInterviewStatus,
  InterviewSettings,
} from '../../types';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'proctoring' | 'assessments'>('requests');
  const [requests, setRequests] = useState<(AccessRequest & { userId?: string })[]>([]);
  const [proctoredFeeds, setProctoredFeeds] = useState<ProctoredLiveFeed[]>([]);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([]);

  // Mock interview assessment states
  const [attempts, setAttempts] = useState<InterviewAttempt[]>([]);
  const [statuses, setStatuses] = useState<(UserInterviewStatus & { candidateName?: string; updatedAt?: string })[]>([]);
  const [settings, setSettings] = useState<InterviewSettings>(localStore.getInterviewSettings());
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const loadLocalSnapshot = () => {
    setRequests(localStore.getAccessRequests());
    setActivityLogs(localStore.getUserActivityLogs());
    setAttempts(localStore.getInterviewAttempts());
    setStatuses(localStore.getUserInterviewStatuses());
    setSettings(localStore.getInterviewSettings());

    const feeds = localStore.getProctoredFeeds();
    setProctoredFeeds(feeds);
    if (!selectedFeedId && feeds.length > 0) {
      setSelectedFeedId(feeds[0].sessionId);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    loadLocalSnapshot();

    let unsubscribeFirestore: (() => void) | undefined;
    if (firestoreService.isAuthenticated()) {
      firestoreService
        .getInterviewSettings()
        .then(remote => {
          if (remote) {
            setSettings(remote);
            localStore.updateInterviewSettings(remote);
          }
        })
        .catch(() => {});

      unsubscribeFirestore = firestoreService.subscribeAdminData({
        onRequests: reqs => {
          if (reqs.length > 0) setRequests(reqs);
        },
        onLogs: logs => {
          if (logs.length > 0) setActivityLogs(logs);
        },
        onAttempts: atts => {
          if (atts.length > 0) setAttempts(atts);
        },
        onStatuses: stats => {
          if (stats.length > 0) setStatuses(stats);
        },
        onFeeds: feeds => {
          setProctoredFeeds(feeds);
        },
      });
    }

    return () => {
      unsubscribeFirestore?.();
    };
  }, [isOpen]);

  const filteredStatuses = useMemo(() => {
    return statuses.filter(s => {
      const name =
        s.candidateName ||
        (s.userId === 'user-student-alex'
          ? 'Alex Mercer'
          : s.userId === 'user-sumanth'
          ? 'Sumanth Rao'
          : s.userId);

      if (searchQuery && !name.toLowerCase().includes(searchQuery.toLowerCase()) && !s.topicSetKey.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (topicFilter !== 'all' && !s.topicSetKey.toLowerCase().includes(topicFilter.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && s.status !== statusFilter) {
        return false;
      }
      if (s.bestScore < minScoreFilter) {
        return false;
      }
      if (dateFromFilter) {
        const refDate = s.completedAt || s.updatedAt || '';
        if (refDate && new Date(refDate) < new Date(dateFromFilter)) {
          return false;
        }
      }
      return true;
    });
  }, [statuses, searchQuery, topicFilter, statusFilter, minScoreFilter, dateFromFilter]);

  const selectedUserAttempts = useMemo(() => {
    if (!selectedUserId) return [];
    return attempts
      .filter(a => a.userId === selectedUserId)
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  }, [attempts, selectedUserId]);

  if (!isOpen) return null;

  const handleApprove = async (req: AccessRequest & { userId?: string }) => {
    const currentUser = localStore.getCurrentUser();
    localStore.approveAccessRequest(req.id, currentUser.email);
    if (firestoreService.isAuthenticated()) {
      await firestoreService.approveAccessRequest(req.id, currentUser.email, req.userId).catch(() => {});
    }
    loadLocalSnapshot();
  };

  const handleReject = async (id: string) => {
    localStore.rejectAccessRequest(id);
    if (firestoreService.isAuthenticated()) {
      await firestoreService.rejectAccessRequest(id).catch(() => {});
    }
    loadLocalSnapshot();
  };

  const handleSaveSettings = async () => {
    localStore.updateInterviewSettings(settings);
    if (firestoreService.isAuthenticated()) {
      await firestoreService.saveInterviewSettings(settings).catch(() => {});
    }
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const handleExportCSV = () => {
    const rows = [
      ['Candidate Name', 'User ID', 'Topic Set', 'Status', 'Best Score', 'Latest Score', 'Attempts Count', 'Last Attempt Date'],
      ...filteredStatuses.map(s => {
        const name =
          s.candidateName ||
          (s.userId === 'user-student-alex'
            ? 'Alex Mercer'
            : s.userId === 'user-sumanth'
            ? 'Sumanth Rao'
            : s.userId);
        const lastDate = s.completedAt || s.updatedAt;
        return [
          name,
          s.userId,
          s.topicSetKey,
          s.status,
          `${s.bestScore}%`,
          `${s.latestScore}%`,
          s.attemptCount.toString(),
          lastDate ? new Date(lastDate).toLocaleDateString() : 'N/A',
        ];
      }),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mock_interview_evaluations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedFeed = proctoredFeeds.find(f => f.sessionId === selectedFeedId) || proctoredFeeds[0];
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const weightSumPct = Math.round(
    (settings.weights.answerQuality +
      settings.weights.posture +
      settings.weights.communication +
      settings.weights.wordFormation +
      settings.weights.speakingStyle) *
      100
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Admin Command Center
              </h2>
              <p className="text-xs text-neutral-400">
                Candidate Approvals, Live Session Telemetry, Evaluations & Rubric Settings
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

        {/* Tab Navigation */}
        <div className="px-6 flex items-center justify-between border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('requests')}
              className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'requests'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Candidate Activity & Approvals</span>
              {pendingRequests.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-bold">
                  {pendingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('proctoring')}
              className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'proctoring'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Video className="w-4 h-4 text-cyan-400" />
              <span>Live Sessions</span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {proctoredFeeds.length} Active
              </span>
            </button>

            <button
              onClick={() => setActiveTab('assessments')}
              className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'assessments'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Mock Evaluations & Pass/Fail</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                {settings.passThreshold}% Pass Gate
              </span>
            </button>
          </div>

          <button
            onClick={loadLocalSnapshot}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Body Viewport */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'requests' && (
            <div className="space-y-6">
              {/* Activity Stream */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <h3 className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    Recent Candidate Activity Stream
                  </h3>
                  <span className="text-neutral-500 text-[11px] font-mono">
                    Firestore & local audit log
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {activityLogs.slice(0, 6).map(act => (
                    <div
                      key={act.id}
                      className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white truncate max-w-[130px]">{act.userName}</span>
                        <span className="text-[10px] font-mono text-neutral-500">
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-300 leading-snug line-clamp-2">
                        {act.description}
                      </p>
                      <div className="text-[10px] font-mono text-neutral-500 truncate">
                        {act.userEmail}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Approvals */}
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Pending Access Approvals ({pendingRequests.length})
                </h3>

                {pendingRequests.length === 0 ? (
                  <div className="p-6 bg-neutral-950/40 border border-neutral-800 rounded-xl text-center text-xs text-neutral-400">
                    No pending approval requests.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pendingRequests.map(req => (
                      <div
                        key={req.id}
                        className="p-4 bg-neutral-950 border border-amber-500/30 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{req.fullName}</span>
                            <span className="font-mono text-[11px] text-neutral-400">{req.email}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                              {req.targetRole}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                            &quot;{req.reason}&quot;
                          </p>
                          <div className="text-[10px] font-mono text-neutral-500">
                            Requested at {new Date(req.createdAt).toLocaleTimeString()} · {new Date(req.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleReject(req.id)}
                            className="px-3 py-1.5 rounded-lg border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-xs font-medium transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApprove(req)}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Approved Candidates */}
              <div className="space-y-3 pt-4 border-t border-neutral-800">
                <h3 className="font-bold text-neutral-300 uppercase tracking-wider text-xs flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Approved Candidates ({approvedRequests.length})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {approvedRequests.map(req => (
                    <div
                      key={req.id}
                      className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{req.fullName}</span>
                        <span className="text-[10px] font-mono text-emerald-400">Approved</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono">{req.email}</div>
                      <div className="text-[10px] text-neutral-500">
                        Role: {req.targetRole} {req.approvedAt && `· Active since ${new Date(req.approvedAt).toLocaleDateString()}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'proctoring' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 space-y-2">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Active Mock Interview Sessions
                </div>
                {proctoredFeeds.length === 0 ? (
                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-400">
                    No active mock interview sessions right now.
                  </div>
                ) : (
                  proctoredFeeds.map(feed => (
                    <button
                      key={feed.sessionId}
                      onClick={() => setSelectedFeedId(feed.sessionId)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all ${
                        selectedFeed?.sessionId === feed.sessionId
                          ? 'bg-neutral-850 border-indigo-500 shadow-sm'
                          : 'bg-neutral-950/70 hover:bg-neutral-850 border-neutral-800 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          {feed.studentName}
                        </span>
                        <span className="font-mono text-cyan-400">{feed.difficulty}</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">{feed.track}</div>
                      <div className="text-[10px] font-mono text-neutral-500 mt-1">
                        Question {feed.currentQuestionIndex + 1} of {feed.totalQuestions}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {selectedFeed && (
                <div className="lg:col-span-8 bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-850 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{selectedFeed.studentName}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                          ACTIVE SESSION
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {selectedFeed.track} · {selectedFeed.difficulty} Level
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Video className="w-3.5 h-3.5" /> Camera {selectedFeed.isCameraActive ? 'Active' : 'Off'}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-indigo-400">
                        <Volume2 className="w-3.5 h-3.5" /> Mic {selectedFeed.isAudioActive ? 'Active' : 'Off'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-neutral-900/70 border border-neutral-800 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-indigo-400 block font-semibold">
                      Current Question:
                    </span>
                    <p className="text-xs text-white font-medium leading-relaxed">
                      {selectedFeed.currentQuestion}
                    </p>
                  </div>

                  <div className="p-3.5 bg-neutral-900/70 border border-neutral-800 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-cyan-400 block font-semibold">
                      Live Response Transcript:
                    </span>
                    <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                      &quot;{selectedFeed.currentTranscript}&quot;
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'assessments' && (
            <div className="space-y-6">
              {/* Filter Bar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-4 relative">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search candidates by name or topic..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <select
                    value={topicFilter}
                    onChange={e => setTopicFilter(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">All Topics</option>
                    {TOOL_TOPICS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Completed">Completed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Not Started">Not Started</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <select
                    value={minScoreFilter}
                    onChange={e => setMinScoreFilter(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={0}>Any Score</option>
                    <option value={80}>80%+ (Passed)</option>
                    <option value={60}>60%+</option>
                  </select>
                </div>

                <div className="md:col-span-2 flex justify-end">
                  <button
                    onClick={handleExportCSV}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-neutral-200 hover:text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <label className="text-neutral-400">Date from:</label>
                <input
                  type="date"
                  value={dateFromFilter}
                  onChange={e => setDateFromFilter(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                />
                {dateFromFilter && (
                  <button
                    onClick={() => setDateFromFilter('')}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Clear date
                  </button>
                )}
              </div>

              {/* Status Table */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Candidate Mock Interview Performance & Pass Gate
                  </span>
                  <span className="text-[11px] font-mono text-neutral-400">
                    Pass Rule: Overall Score &ge; {settings.passThreshold}%
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-900/60 border-b border-neutral-800 text-[11px] text-neutral-400 font-mono">
                      <tr>
                        <th className="p-3">Candidate</th>
                        <th className="p-3">Topics & Role</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Attempts</th>
                        <th className="p-3">Best Score</th>
                        <th className="p-3">Latest Score</th>
                        <th className="p-3">Last Attempt</th>
                        <th className="p-3 text-right">Drill-Down</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850">
                      {filteredStatuses.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-neutral-500">
                            No candidate records match the current filters.
                          </td>
                        </tr>
                      ) : (
                        filteredStatuses.map(s => {
                          const name =
                            s.candidateName ||
                            (s.userId === 'user-student-alex'
                              ? 'Alex Mercer'
                              : s.userId === 'user-sumanth'
                              ? 'Sumanth Rao'
                              : s.userId);
                          const isCompleted = s.status === 'Completed' || s.bestScore >= settings.passThreshold;
                          const lastDate = s.completedAt || s.updatedAt;

                          return (
                            <tr key={s.userId + s.topicSetKey} className="hover:bg-neutral-900/40 transition-colors">
                              <td className="p-3 font-semibold text-white">
                                {name}
                                <span className="block text-[10px] font-mono text-neutral-500 font-normal">{s.userId}</span>
                              </td>
                              <td className="p-3 text-neutral-300 font-mono text-[11px]">
                                {s.topicSetKey}
                              </td>
                              <td className="p-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                                  isCompleted
                                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                    : s.status === 'Not Started'
                                    ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                }`}>
                                  {isCompleted ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3 text-amber-400" />}
                                  {isCompleted ? 'Completed' : s.status}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-neutral-300">{s.attemptCount}</td>
                              <td className="p-3 font-mono font-bold text-emerald-400">{s.bestScore}%</td>
                              <td className="p-3 font-mono font-bold text-indigo-300">{s.latestScore}%</td>
                              <td className="p-3 font-mono text-neutral-400 text-[11px]">
                                {lastDate ? new Date(lastDate).toLocaleDateString() : '—'}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => setSelectedUserId(s.userId)}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg transition-colors"
                                >
                                  View History
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Per-User Drill-Down with Score Trend & Full Attempt Logs */}
              {selectedUserId && (
                <div className="p-5 bg-neutral-950 border border-indigo-500/50 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-850 pb-3">
                    <div>
                      <span className="text-xs font-bold text-white">
                        Candidate Attempt Drill-Down ({selectedUserId})
                      </span>
                      <span className="text-[11px] text-neutral-400 block">
                        {selectedUserAttempts.length} recorded attempt(s) with score progression & transcripts
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedUserId(null)}
                      className="text-xs text-neutral-400 hover:text-white"
                    >
                      Close Drill-Down
                    </button>
                  </div>

                  {selectedUserAttempts.length === 0 ? (
                    <div className="text-xs text-neutral-500 py-3">
                      No detailed attempt transcripts found for this candidate yet.
                    </div>
                  ) : (
                    <>
                      {/* Score Trend Over Attempts */}
                      <div className="p-3 bg-neutral-900/70 border border-neutral-800 rounded-lg space-y-2">
                        <div className="text-[10px] font-mono uppercase text-indigo-400 flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>Score Trend Over Attempts</span>
                        </div>
                        <div className="flex items-end gap-3 h-20 pt-2">
                          {selectedUserAttempts.map((att, idx) => (
                            <div key={att.id} className="flex flex-col items-center gap-1 flex-1 max-w-[64px]">
                              <span className="text-[10px] font-mono text-white">{att.overallScore}%</span>
                              <div className="w-full bg-neutral-800 rounded-t h-12 flex items-end overflow-hidden">
                                <div
                                  className={`w-full rounded-t ${att.passed ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                  style={{ height: `${Math.max(8, att.overallScore)}%` }}
                                />
                              </div>
                              <span className="text-[9px] font-mono text-neutral-500">#{idx + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Attempts List */}
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {selectedUserAttempts.map((att, attIdx) => (
                          <div key={att.id} className="p-3.5 bg-neutral-900/60 border border-neutral-800 rounded-lg space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-white">
                                Attempt #{attIdx + 1} · {att.selectedTopics.join(', ')}
                              </span>
                              <span className={`font-mono font-bold ${att.passed ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {att.overallScore}% ({att.passed ? 'PASSED' : 'RETRY'})
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {att.answers.map((ans, aIdx) => (
                                <div key={aIdx} className="p-2.5 bg-neutral-950 rounded border border-neutral-850 text-xs space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-white">Q{aIdx + 1} ({ans.topic}): {ans.questionText}</span>
                                    <span className="font-mono text-emerald-400">{ans.evaluation?.overallScore ?? 0}%</span>
                                  </div>
                                  <p className="text-neutral-300 italic text-[11px]">&quot;{ans.transcript}&quot;</p>
                                  <div className="text-[10px] text-neutral-400 flex flex-wrap gap-3 font-mono">
                                    <span>WPM: {ans.speechMetrics.wpm}</span>
                                    <span>Posture: {ans.postureMetrics.goodPosturePct}%</span>
                                    <span>Fillers: {ans.speechMetrics.fillerCount}</span>
                                    <span>Posture Events: {ans.postureMetrics.events?.length || 0}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Editable Admin Settings Panel */}
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Configurable Rubric Weights, Pass Threshold & Session Defaults
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[11px] font-mono ${weightSumPct === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      Total Weights: {weightSumPct}%
                    </span>
                    <button
                      onClick={handleSaveSettings}
                      disabled={weightSumPct !== 100}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      {settingsSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{settingsSaved ? 'Saved' : 'Save Settings'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-neutral-900 rounded-lg space-y-1">
                    <label className="text-neutral-400 block text-[10px]">Pass Threshold (%)</label>
                    <input
                      type="number"
                      min={50}
                      max={100}
                      value={settings.passThreshold}
                      onChange={e => setSettings({ ...settings, passThreshold: Number(e.target.value) })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-white font-mono"
                    />
                  </div>
                  <div className="p-3 bg-neutral-900 rounded-lg space-y-1">
                    <label className="text-neutral-400 block text-[10px]">Default Questions / Session</label>
                    <input
                      type="number"
                      min={3}
                      max={20}
                      value={settings.defaultQuestionsPerSession}
                      onChange={e => setSettings({ ...settings, defaultQuestionsPerSession: Number(e.target.value) })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-white font-mono"
                    />
                  </div>
                  <div className="p-3 bg-neutral-900 rounded-lg space-y-1">
                    <label className="text-neutral-400 block text-[10px]">Default Time / Answer (sec)</label>
                    <input
                      type="number"
                      min={30}
                      max={300}
                      value={settings.defaultTimePerAnswerSec}
                      onChange={e => setSettings({ ...settings, defaultTimePerAnswerSec: Number(e.target.value) })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                  {(
                    [
                      ['answerQuality', 'Answer Quality %'],
                      ['posture', 'Body Posture %'],
                      ['communication', 'Communication %'],
                      ['wordFormation', 'Word Formation %'],
                      ['speakingStyle', 'Speaking Style %'],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="p-3 bg-neutral-900 rounded-lg space-y-1">
                      <label className="text-neutral-400 block text-[10px]">{label}</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={Math.round(settings.weights[key] * 100)}
                        onChange={e =>
                          setSettings({
                            ...settings,
                            weights: {
                              ...settings.weights,
                              [key]: Math.max(0, Math.min(100, Number(e.target.value))) / 100,
                            },
                          })
                        }
                        className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-white font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
