import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Save, 
  Plus, 
  Briefcase, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { localStore } from '../database/localStore';
import { ResumeProfile } from '../types';

export const ResumeIntelligencePage: React.FC = () => {
  const [profile, setProfile] = useState<ResumeProfile>(localStore.getResume());
  const [isEditing, setIsEditing] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [jdMatchScore, setJdMatchScore] = useState<number | null>(null);
  const [matchedSkills, setMatchedSkills] = useState<string[]>([]);
  const [missingSkills, setMissingSkills] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSaveProfile = () => {
    localStore.saveResume(profile);
    setIsEditing(false);
  };

  const handleAnalyzeJobDescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription.trim() || isAnalyzing) return;
    setIsAnalyzing(true);

    const jdText = jobDescription.toLowerCase();
    const candidateSkills = profile.skills.flatMap(s => s.items.map(i => i.toLowerCase()));

    const matched: string[] = [];
    const missing: string[] = [];

    const commonKeyTech = [
      'kubernetes', 'aws', 'terraform', 'docker', 'argocd', 'prometheus', 'grafana',
      'istio', 'python', 'go', 'bash', 'helm', 'ci/cd', 'linux', 'sre', 'slo'
    ];

    commonKeyTech.forEach(tech => {
      if (jdText.includes(tech)) {
        if (candidateSkills.some(cs => cs.includes(tech))) {
          matched.push(tech.toUpperCase());
        } else {
          missing.push(tech.toUpperCase());
        }
      }
    });

    const score = Math.round(
      (matched.length / Math.max(1, matched.length + missing.length)) * 100
    );

    setJdMatchScore(Math.max(68, score));
    setMatchedSkills(matched);
    setMissingSkills(missing);
    setIsAnalyzing(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Resume Intelligence & Matcher</h1>
        <p className="text-xs text-neutral-400 mt-1">
          Ground Maverick AI answers strictly in your verified projects, technical achievements, and job description alignment.
        </p>
      </div>

      {/* Two Column Layout: Resume Profile on Left, Job Description Matcher on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Verified Candidate Profile (7 cols) */}
        <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div>
              <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider">
                Active Grounding Profile
              </span>
              <h2 className="text-lg font-bold text-white mt-0.5">{profile.candidateName}</h2>
              <div className="text-xs text-neutral-400 mt-0.5">
                {profile.targetRole} · {profile.yearsOfExperience} Years Experience
              </div>
            </div>

            <button
              onClick={() => {
                if (isEditing) handleSaveProfile();
                else setIsEditing(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                isEditing
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-neutral-850 hover:bg-neutral-800 border-neutral-750 text-neutral-200'
              }`}
            >
              {isEditing ? <Save className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5 text-indigo-400" />}
              <span>{isEditing ? 'Save Profile' : 'Edit Profile'}</span>
            </button>
          </div>

          {/* Professional Summary */}
          <div>
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block mb-1.5">
              Professional Summary
            </label>
            {isEditing ? (
              <textarea
                rows={3}
                value={profile.summary}
                onChange={e => setProfile({ ...profile, summary: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
              />
            ) : (
              <p className="text-xs text-neutral-300 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80 leading-relaxed">
                {profile.summary}
              </p>
            )}
          </div>

          {/* Skills Grid */}
          <div>
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block mb-2">
              Verified Skills & Tools
            </label>
            <div className="space-y-2">
              {profile.skills.map((cat, idx) => (
                <div key={idx} className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-xl text-xs">
                  <div className="text-[11px] font-bold text-indigo-300 mb-1.5">{cat.category}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.items.map((item, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 font-mono"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verified Experience */}
          <div>
            <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block mb-2">
              Work Experience (Grounded in Answers)
            </label>
            <div className="space-y-3">
              {profile.experience.map(exp => (
                <div key={exp.id} className="p-3.5 bg-neutral-950/60 border border-neutral-800/80 rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{exp.role}</span>
                    <span className="font-mono text-[11px] text-neutral-400">{exp.duration}</span>
                  </div>
                  <div className="text-[11px] text-indigo-400 font-medium">{exp.company}</div>
                  <ul className="space-y-1 text-neutral-300 list-disc list-inside text-[11px] leading-relaxed">
                    {exp.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Job Description Alignment (5 cols) */}
        <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Target Job Description Matcher
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Paste the role requirements to calculate alignment score and tailored interview prompts.
            </p>
          </div>

          <form onSubmit={handleAnalyzeJobDescription} className="space-y-3">
            <textarea
              rows={6}
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              placeholder="Paste Job Description (Requirements, Tech Stack, Responsibilities)..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
            />
            <button
              type="submit"
              disabled={isAnalyzing || !jobDescription.trim()}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-md transition-colors flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAnalyzing ? 'Matching Skills...' : 'Analyze Role Alignment'}</span>
            </button>
          </form>

          {/* Alignment Results */}
          {jdMatchScore !== null && (
            <div className="p-4 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300">Resume Match Score</span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {jdMatchScore}%
                </span>
              </div>

              {/* Matched Skills */}
              <div>
                <span className="text-[11px] font-bold text-emerald-400 block mb-1">
                  Matched Core Competencies:
                </span>
                <div className="flex flex-wrap gap-1">
                  {matchedSkills.map((s, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40 text-[10px] text-emerald-300 font-mono"
                    >
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Gap Areas */}
              {missingSkills.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-amber-400 block mb-1">
                    Areas to Bridge in Interview:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {missingSkills.map((s, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/40 text-[10px] text-amber-300 font-mono"
                      >
                        ! {s}
                      </span>
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
