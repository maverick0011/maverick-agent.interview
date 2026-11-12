import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  UserCheck, 
  Users, 
  Video, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Radio, 
  Sparkles, 
  AlertTriangle,
  RefreshCw,
  Search,
  Volume2,
  Award,
  Download,
  Sliders,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Activity,
  History
} from 'lucide-react';
import { localStore, UserActivityLog } from '../../database/localStore';
import { 
  AccessRequest, 
  ProctoredLiveFeed, 
  InterviewAttempt, 
  UserInterviewStatus, 
  InterviewSettings 
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
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [proctoredFeeds, setProctoredFeeds] = useState<ProctoredLiveFeed[]>([]);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([]);

  // Mock interview assessment states
  const [attempts, setAttempts] = useState<InterviewAttempt[]>([]);
  const [statuses, setStatuses] = useState<UserInterviewStatus[]>([]);
  const [settings, setSettings] = useState<InterviewSettings>(localStore.getInterviewSettings());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState<InterviewAttempt | null>(null);

  const refreshData = () => {
    const reqs = localStore.getAccessRequests();
    setRequests(reqs);

    const logs = localStore.getUserActivityLogs();
    setActivityLogs(logs);

    const atts = localStore.getInterviewAttempts();
    setAttempts(atts);

    const userStats = localStore.getUserInterviewStatuses();
    setStatuses(userStats);

    setSettings(localStore.getInterviewSettings());

    let feeds = localStore.getProctoredFeeds();
    if (feeds.length === 0) {
      feeds = [
        {
          sessionId: 'live-demo-01',
          studentId: 'user-sumanth',
          studentName: 'Sumanth Rao',
          track: 'DevOps & SRE Specialist',
          difficulty: 'Senior',
          startedAt: new Date(Date.now() - 420000).toISOString(),
          currentQuestionIndex: 2,
          totalQuestions: 4,
          currentQuestion: 'How do you design an enterprise CI/CD pipeline enforcing image vulnerability scanning and cryptographic Cosign signing?',
          currentTranscript: 'In our pipeline, we run Trivy container scanning in the pull-request check, then sign artifacts using Cosign private keys stored in AWS KMS...',
          isCameraActive: true,
          isAudioActive: true,
          status: 'live',
          lastHeartbeat: new Date().toISOString(),
        },
      ];
    }
    setProctoredFeeds(feeds);
    if (!selectedFeedId && feeds.length > 0) {
      setSelectedFeedId(feeds[0].sessionId);
    }
  };

  const handleExportCSV = () => {
    const rows = [
      ['Candidate Name', 'User ID', 'Topic Set', 'Status', 'Best Score', 'Latest Score', 'Attempts Count', 'Completed Date'],
      ...statuses.map(s => [
        s.userId === 'user-student-alex' ? 'Alex Mercer' : s.userId === 'user-sumanth' ? 'Sumanth Rao' : s.userId,
        s.userId,
        s.topicSetKey,
        s.status,
        `${s.bestScore}%`,
        `${s.latestScore}%`,
        s.attemptCount.toString(),
        s.completedAt ? new Date(s.completedAt).toLocaleDateString() : 'N/A'
      ])
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

  useEffect(() => {
    if (isOpen) {
      refreshData();
      const interval = setInterval(refreshData, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApprove = (id: string) => {
    localStore.approveAccessRequest(id, 'mavbharath01@gmail.com');
    refreshData();
  };

  const handleReject = (id: string) => {
    localStore.rejectAccessRequest(id);
    refreshData();
  };

  const selectedFeed = proctoredFeeds.find(f => f.sessionId === selectedFeedId) || proctoredFeeds[0];

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Admin Command Center
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 uppercase font-semibold">
                  Admin: mavbharath01@gmail.com
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Authorized Evaluator · Live Mock Interview Video Feeds & Candidate Activity Logs
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
              <span>Student Activity & Approvals</span>
              {pendingRequests.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-bold">
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
              <span>Live Video Feeds (Assess Student)</span>
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
                80% Pass Gate
              </span>
            </button>
          </div>

          <button
            onClick={refreshData}
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
              {/* Real-time Student Activity Stream */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <h3 className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    Real-Time Student Activity Stream (Monitored by mavbharath01@gmail.com)
                  </h3>
                  <span className="text-neutral-500 text-[11px] font-mono">
                    Live telemetry & SSO audit logs
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

              {/* Pending Approvals Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <h3 className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Pending Student Login Approvals ({pendingRequests.length})
                  </h3>
                  <span className="text-neutral-500 text-[11px]">
                    Requires admin approval by mavbharath01@gmail.com
                  </span>
                </div>

                {pendingRequests.length === 0 ? (
                  <div className="p-6 bg-neutral-950/40 border border-neutral-800 rounded-xl text-center text-xs text-neutral-400">
                    No pending approval requests. All candidate sign-ups have been processed.
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
                            onClick={() => handleApprove(req.id)}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve Login</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Already Approved Students Section */}
              <div className="space-y-3 pt-4 border-t border-neutral-800">
                <h3 className="font-bold text-neutral-300 uppercase tracking-wider text-xs flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Approved Academy Students ({approvedRequests.length})
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
              {/* Left Column: Active Students List (4 cols) */}
              <div className="lg:col-span-4 space-y-2">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Active Mock Interview Sessions
                </div>
                {proctoredFeeds.map(feed => (
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
                ))}
              </div>

              {/* Right Column: Live Video Feed & Stream Monitor (8 cols) */}
              {selectedFeed && (
                <div className="lg:col-span-8 bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-850 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{selectedFeed.studentName}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                          LIVE STUDENT FEED · ASSESSING PERFORMANCE
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {selectedFeed.track} · {selectedFeed.difficulty} Level · Evaluated by <strong className="text-amber-300">mavbharath01@gmail.com</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Video className="w-3.5 h-3.5" /> Live Camera
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-indigo-400">
                        <Volume2 className="w-3.5 h-3.5" /> Mic Monitored
                      </span>
                    </div>
                  </div>

                  {/* Video Screen Viewport */}
                  <div className="relative aspect-video bg-black rounded-xl border border-neutral-800 overflow-hidden flex items-center justify-center">
                    {selectedFeed.videoFrameDataUrl ? (
                      <img
                        src={selectedFeed.videoFrameDataUrl}
                        alt="Candidate Proctor Feed"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      /* Stylized simulated webcam feed */
                      <div className="w-full h-full bg-gradient-to-b from-neutral-900 to-neutral-950 flex flex-col items-center justify-center p-6 text-center space-y-2">
                        <div className="relative">
                          <div className="w-20 h-20 rounded-full bg-neutral-800 border-2 border-indigo-500/50 flex items-center justify-center text-xl font-bold text-white shadow-inner">
                            {selectedFeed.studentName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-400 border-2 border-black animate-pulse" />
                        </div>
                        <div className="text-xs text-white font-semibold">
                          Live Video Stream Broadcast
                        </div>
                        <div className="text-[11px] text-neutral-500 font-mono">
                          Camera feed transmitted live to evaluator mavbharath01@gmail.com
                        </div>
                      </div>
                    )}

                    {/* On-video watermark */}
                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded border border-white/10 text-[10px] font-mono text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      LIVE FEED · EVALUATOR: mavbharath01@gmail.com
                    </div>
                  </div>

                  {/* Current Active Interview Question */}
                  <div className="p-3.5 bg-neutral-900/70 border border-neutral-800 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-indigo-400 block font-semibold">
                      Current Question Asked to Candidate:
                    </span>
                    <p className="text-xs text-white font-medium leading-relaxed">
                      {selectedFeed.currentQuestion}
                    </p>
                  </div>

                  {/* Live Candidate Response Audio Transcript */}
                  <div className="p-3.5 bg-neutral-900/70 border border-neutral-800 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-cyan-400 block font-semibold">
                      Live Candidate Speech Audio Transcript:
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
              {/* Controls bar: Search, Filter, Export, Config */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search candidates by name or role..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-2 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-neutral-200 hover:text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Status Table */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Candidate Mock Interview Performance & 80% Pass Gate
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
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850">
                      {statuses
                        .filter(s => {
                          const name = s.userId === 'user-student-alex' ? 'Alex Mercer' : s.userId === 'user-sumanth' ? 'Sumanth Rao' : s.userId;
                          return name.toLowerCase().includes(searchQuery.toLowerCase()) || s.topicSetKey.toLowerCase().includes(searchQuery.toLowerCase());
                        })
                        .map(s => {
                          const name = s.userId === 'user-student-alex' ? 'Alex Mercer' : s.userId === 'user-sumanth' ? 'Sumanth Rao' : s.userId;
                          const isCompleted = s.status === 'Completed' || s.bestScore >= settings.passThreshold;

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
                                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                }`}>
                                  {isCompleted ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3 text-amber-400" />}
                                  {isCompleted ? 'Completed (Passed)' : 'In Progress'}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-neutral-300">{s.attemptCount}</td>
                              <td className="p-3 font-mono font-bold text-emerald-400">{s.bestScore}%</td>
                              <td className="p-3 font-mono font-bold text-indigo-300">{s.latestScore}%</td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => {
                                    const match = attempts.find(a => a.userId === s.userId) || attempts[0];
                                    if (match) setSelectedAttempt(match);
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg transition-colors"
                                >
                                  View Report
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Configurable Admin Scoring Weights Panel */}
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Configurable Assessment Scoring Weights & Pass Rules
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">
                    Total: {Math.round((settings.weights.answerQuality + settings.weights.posture + settings.weights.communication + settings.weights.wordFormation + settings.weights.speakingStyle) * 100)}%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                  <div className="p-3 bg-neutral-900 rounded-lg">
                    <span className="text-neutral-400 block text-[10px]">Answer Quality (Technical)</span>
                    <span className="text-sm font-bold text-white font-mono">{Math.round(settings.weights.answerQuality * 100)}%</span>
                  </div>
                  <div className="p-3 bg-neutral-900 rounded-lg">
                    <span className="text-neutral-400 block text-[10px]">Body Posture (Live Skeleton)</span>
                    <span className="text-sm font-bold text-white font-mono">{Math.round(settings.weights.posture * 100)}%</span>
                  </div>
                  <div className="p-3 bg-neutral-900 rounded-lg">
                    <span className="text-neutral-400 block text-[10px]">Communication (WPM & Fluency)</span>
                    <span className="text-sm font-bold text-white font-mono">{Math.round(settings.weights.communication * 100)}%</span>
                  </div>
                  <div className="p-3 bg-neutral-900 rounded-lg">
                    <span className="text-neutral-400 block text-[10px]">Word Formation (Grammar)</span>
                    <span className="text-sm font-bold text-white font-mono">{Math.round(settings.weights.wordFormation * 100)}%</span>
                  </div>
                  <div className="p-3 bg-neutral-900 rounded-lg">
                    <span className="text-neutral-400 block text-[10px]">Speaking Style (Tone/Pauses)</span>
                    <span className="text-sm font-bold text-white font-mono">{Math.round(settings.weights.speakingStyle * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* Attempt Detail Modal / Drawer if selected */}
              {selectedAttempt && (
                <div className="p-4 bg-neutral-950 border border-indigo-500/50 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-850 pb-2">
                    <div>
                      <span className="text-xs font-bold text-white">
                        Attempt Drill-Down: {selectedAttempt.candidateName}
                      </span>
                      <span className="text-[11px] text-neutral-400 block">
                        Topics: {selectedAttempt.selectedTopics.join(', ')} · Overall Score: {selectedAttempt.overallScore}% ({selectedAttempt.passed ? 'PASSED' : 'RETRY'})
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedAttempt(null)}
                      className="text-xs text-neutral-400 hover:text-white"
                    >
                      Close Detail
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedAttempt.answers.map((ans, aIdx) => (
                      <div key={aIdx} className="p-3 bg-neutral-900/60 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">Q{aIdx + 1} ({ans.topic}): {ans.questionText}</span>
                          <span className="font-mono text-emerald-400">{ans.evaluation?.overallScore ?? 0}%</span>
                        </div>
                        <p className="text-neutral-300 italic text-[11px]">&quot;{ans.transcript}&quot;</p>
                        <div className="text-[10px] text-neutral-400 flex gap-3 font-mono">
                          <span>WPM: {ans.speechMetrics.wpm}</span>
                          <span>Posture: {ans.postureMetrics.goodPosturePct}%</span>
                          <span>Fillers: {ans.speechMetrics.fillerCount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
