import React, { useState } from 'react';
import { 
  Network, 
  Sparkles, 
  Send, 
  Sliders, 
  Layers, 
  Database, 
  ShieldCheck, 
  Edit3, 
  Eye, 
  Check,
  Download
} from 'lucide-react';
import { systemDesignService } from '../services/systemDesignService';
import { MermaidViewer } from '../components/common/MermaidViewer';
import { localStore } from '../database/localStore';
import { SystemDesignDiagram } from '../types';

export const SystemDesignPage: React.FC = () => {
  const templates = systemDesignService.getPrebuiltTemplates();
  const [selectedDiagram, setSelectedDiagram] = useState<SystemDesignDiagram>(templates[0]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isEditingMermaid, setIsEditingMermaid] = useState(false);
  const [editedCode, setEditedCode] = useState(templates[0].mermaidCode);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSelectTemplate = (diag: SystemDesignDiagram) => {
    setSelectedDiagram(diag);
    setEditedCode(diag.mermaidCode);
    setIsEditingMermaid(false);
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim() || isGenerating) return;
    setIsGenerating(true);

    const generated = systemDesignService.generateSystemDesign(customPrompt.trim());
    setSelectedDiagram(generated);
    setEditedCode(generated.mermaidCode);
    localStore.saveSystemDesign(generated);
    setCustomPrompt('');
    setIsGenerating(false);
  };

  const handleApplyEditedCode = () => {
    setSelectedDiagram(prev => ({ ...prev, mermaidCode: editedCode }));
    setIsEditingMermaid(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">System Design Studio</h1>
        <p className="text-xs text-neutral-400 mt-1">
          Interactive architecture diagrams, distributed scale specifications, and trade-off matrices.
        </p>
      </div>

      {/* Generator Prompt Bar */}
      <form onSubmit={handleGenerate} className="flex gap-2">
        <input
          type="text"
          placeholder="e.g. Design a URL shortener with 100k read QPS, or High-Availability Kubernetes on AWS..."
          value={customPrompt}
          onChange={e => setCustomPrompt(e.target.value)}
          className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={isGenerating || !customPrompt.trim()}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-md transition-colors shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isGenerating ? 'Synthesizing...' : 'Generate Architecture'}</span>
        </button>
      </form>

      {/* Preset Architecture Templates Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="font-mono text-neutral-500 text-[11px] shrink-0">Presets:</span>
        {templates.map(tpl => (
          <button
            key={tpl.id}
            onClick={() => handleSelectTemplate(tpl)}
            className={`px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
              selectedDiagram.id === tpl.id
                ? 'bg-neutral-850 border-indigo-500 text-white font-semibold'
                : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            {tpl.title}
          </button>
        ))}
      </div>

      {/* Main Diagram Viewport */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-tight">
            {selectedDiagram.title}
          </h2>
          <button
            onClick={() => setIsEditingMermaid(!isEditingMermaid)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-md transition-colors"
          >
            {isEditingMermaid ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5 text-indigo-400" />}
            <span>{isEditingMermaid ? 'Preview Diagram' : 'Edit Mermaid Code'}</span>
          </button>
        </div>

        {isEditingMermaid ? (
          <div className="space-y-3 bg-neutral-900 p-4 border border-neutral-800 rounded-xl">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="font-mono">Mermaid Specification Editor</span>
              <button
                onClick={handleApplyEditedCode}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md font-semibold text-xs transition-colors"
              >
                Apply Changes
              </button>
            </div>
            <textarea
              rows={12}
              value={editedCode}
              onChange={e => setEditedCode(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 font-mono text-xs text-cyan-300 focus:outline-none focus:border-indigo-500"
            />
          </div>
        ) : (
          <MermaidViewer chart={selectedDiagram.mermaidCode} />
        )}
      </div>

      {/* Specifications & Architectural Details */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-neutral-900/70 border border-neutral-800 rounded-xl">
          <div className="text-[11px] font-mono text-neutral-400 mb-1">Target Throughput (QPS)</div>
          <div className="text-sm font-bold text-white font-mono">
            {selectedDiagram.scaleRequirements.qps}
          </div>
        </div>
        <div className="p-4 bg-neutral-900/70 border border-neutral-800 rounded-xl">
          <div className="text-[11px] font-mono text-neutral-400 mb-1">Storage & Footprint</div>
          <div className="text-sm font-bold text-white font-mono">
            {selectedDiagram.scaleRequirements.storage}
          </div>
        </div>
        <div className="p-4 bg-neutral-900/70 border border-neutral-800 rounded-xl">
          <div className="text-[11px] font-mono text-neutral-400 mb-1">Latency SLA</div>
          <div className="text-sm font-bold text-white font-mono">
            {selectedDiagram.scaleRequirements.latency}
          </div>
        </div>
        <div className="p-4 bg-neutral-900/70 border border-neutral-800 rounded-xl">
          <div className="text-[11px] font-mono text-neutral-400 mb-1">Availability Target</div>
          <div className="text-sm font-bold text-white font-mono">
            {selectedDiagram.scaleRequirements.availability}
          </div>
        </div>
      </div>

      {/* Two Columns: Component Topology & Trade-offs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Component Topology */}
        <div className="p-5 bg-neutral-900/70 border border-neutral-800 rounded-2xl space-y-3">
          <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Core Infrastructure Components
          </h3>
          <div className="space-y-2">
            {selectedDiagram.components.map((c, i) => (
              <div key={i} className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{c.name}</span>
                  <span className="font-mono text-[11px] text-cyan-300 px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                    {c.technology}
                  </span>
                </div>
                <p className="text-neutral-400 text-[11px] leading-relaxed">{c.purpose}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trade-offs & Resilience */}
        <div className="p-5 bg-neutral-900/70 border border-neutral-800 rounded-2xl space-y-3">
          <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Key Architectural Trade-Offs
          </h3>
          <div className="space-y-2.5">
            {selectedDiagram.tradeoffs.map((t, i) => (
              <div key={i} className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-xl text-xs text-neutral-300 leading-relaxed">
                {t}
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-neutral-800/80">
            <div className="text-[11px] text-neutral-400 leading-relaxed bg-neutral-950 p-3 rounded-xl border border-neutral-800/60">
              <strong className="text-white block mb-1">Architectural Rationale:</strong>
              {selectedDiagram.explanation}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
