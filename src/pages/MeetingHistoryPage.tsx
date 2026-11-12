import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Trash2, 
  Download, 
  FileText, 
  Clock, 
  Calendar, 
  ChevronRight, 
  Sparkles,
  Volume2,
  Mic,
  Printer
} from 'lucide-react';
import { localStore } from '../database/localStore';
import { InterviewSession } from '../types';

export const MeetingHistoryPage: React.FC = () => {
  const [sessions, setSessions] = useState<InterviewSession[]>(localStore.getSessions());
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    sessions[0]?.id || null
  );
  const [searchQuery, setSearchQuery] = useState('');

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteSession = (id: string) => {
    localStore.deleteSession(id);
    const updated = localStore.getSessions();
    setSessions(updated);
    if (selectedSessionId === id) {
      setSelectedSessionId(updated[0]?.id || null);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all historical meeting sessions?')) {
      localStore.clearAllSessions();
      setSessions([]);
      setSelectedSessionId(null);
    }
  };

  const handleExportMarkdown = (s: InterviewSession) => {
    let md = `# ${s.title}\n`;
    md += `**Date**: ${new Date(s.createdAt).toLocaleString()}\n`;
    md += `**Role**: ${s.role} ${s.company ? `(${s.company})` : ''}\n`;
    md += `**Duration**: ${Math.round(s.durationSeconds / 60)} minutes\n\n`;

    if (s.summary) {
      md += `## Summary\n${s.summary}\n\n`;
    }

    if (s.actionItems && s.actionItems.length > 0) {
      md += `## Action Items\n`;
      s.actionItems.forEach(item => (md += `- [ ] ${item}\n`));
      md += `\n`;
    }

    md += `## Transcript\n`;
    s.transcripts.forEach(t => {
      md += `**[${t.timestamp}] ${t.channel.toUpperCase()}**: ${t.text}\n\n`;
    });

    if (s.responses && s.responses.length > 0) {
      md += `## AI Answers Generated\n`;
      s.responses.forEach(r => {
        md += `### Q: ${r.questionText}\n`;
        md += `*Mode: ${r.mode} | Latency: ${r.latencyMs}ms*\n\n`;
        md += `${r.answerText}\n\n`;
      });
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-${s.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = (s: InterviewSession) => {
    const jsonStr = JSON.stringify(s, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-${s.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Meeting Memory & Session History</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Archived interview sessions, dual-channel transcripts, AI recommendations, and exportable debriefs.
          </p>
        </div>

        {sessions.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-white bg-rose-950/30 hover:bg-rose-900/50 border border-rose-900/40 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Main Viewport */}
      {sessions.length === 0 ? (
        <div className="p-12 bg-neutral-900 border border-neutral-800 rounded-2xl text-center space-y-2">
          <History className="w-8 h-8 text-neutral-500 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Recorded Sessions</h3>
          <p className="text-xs text-neutral-400">
            Completed Live Copilot meetings will be archived here automatically with full dual-channel transcripts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Session Selector (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
              <input
                type="text"
                placeholder="Search past sessions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-2">
              {filteredSessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all ${
                    selectedSessionId === session.id
                      ? 'bg-neutral-850 border-indigo-500 text-white'
                      : 'bg-neutral-900/70 hover:bg-neutral-850/60 border-neutral-800 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1">
                    <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                    <span>{Math.round(session.durationSeconds / 60)} min</span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-0.5 truncate">{session.title}</h4>
                  <div className="text-[11px] text-indigo-400">{session.role}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Session Details (8 cols) */}
          {selectedSession && (
            <div className="lg:col-span-8 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
              {/* Header & Export Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedSession.title}</h2>
                  <div className="text-xs text-neutral-400 mt-1 flex items-center gap-2">
                    <span>{selectedSession.role}</span>
                    <span>·</span>
                    <span>{new Date(selectedSession.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportMarkdown(selectedSession)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-850 hover:bg-neutral-800 text-neutral-200 border border-neutral-700/80 rounded-lg text-xs font-medium transition-colors"
                    title="Export Markdown file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Markdown</span>
                  </button>
                  <button
                    onClick={() => handleExportJSON(selectedSession)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-850 hover:bg-neutral-800 text-neutral-200 border border-neutral-700/80 rounded-lg text-xs font-medium transition-colors"
                    title="Export raw JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>JSON</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="p-1.5 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 rounded-lg border border-neutral-700/80 transition-colors"
                    title="Print / Save as PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteSession(selectedSession.id)}
                    className="p-1.5 text-neutral-400 hover:text-rose-400 rounded-lg border border-neutral-800 transition-colors"
                    title="Delete this session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Summary & Action Items */}
              {selectedSession.summary && (
                <div className="p-4 bg-neutral-950/70 border border-neutral-800 rounded-xl space-y-2">
                  <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                    Executive Debrief
                  </h3>
                  <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                    {selectedSession.summary}
                  </p>
                </div>
              )}

              {/* Transcripts List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center justify-between">
                  <span>Session Transcript ({selectedSession.transcripts.length})</span>
                  <span className="font-mono text-neutral-500 font-normal">Dual-Channel</span>
                </h3>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {selectedSession.transcripts.map(seg => (
                    <div
                      key={seg.id}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        seg.channel === 'interviewer'
                          ? 'bg-cyan-950/20 border-cyan-800/40 text-neutral-200'
                          : 'bg-indigo-950/20 border-indigo-800/40 text-neutral-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                          {seg.channel === 'interviewer' ? (
                            <span className="text-cyan-400">Interviewer</span>
                          ) : (
                            <span className="text-indigo-400">Candidate</span>
                          )}
                        </span>
                        <span className="font-mono text-neutral-500">{seg.timestamp}</span>
                      </div>
                      <div className="leading-relaxed">{seg.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
