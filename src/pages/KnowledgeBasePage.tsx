import React, { useState } from 'react';
import { 
  Database, 
  FileText, 
  Upload, 
  Search, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Sparkles, 
  Layers,
  CheckCircle2
} from 'lucide-react';
import { localStore } from '../database/localStore';
import { ragService } from '../services/ragService';
import { KnowledgeDocument, GroundedSource } from '../types';

export const KnowledgeBasePage: React.FC = () => {
  const [docs, setDocs] = useState<KnowledgeDocument[]>(localStore.getKnowledgeDocs());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GroundedSource[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'runbook' | 'architecture' | 'notes' | 'cheatsheet'>('runbook');
  const [newContent, setNewContent] = useState('');

  const handleDelete = (id: string) => {
    localStore.deleteKnowledgeDoc(id);
    setDocs(localStore.getKnowledgeDocs());
  };

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const chunks = ragService.chunkDocument(`doc-${Date.now()}`, newTitle, newContent);
    const newDoc: KnowledgeDocument = {
      id: `doc-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      chunksCount: chunks.length,
      sizeBytes: new Blob([newContent]).size,
      lastIndexed: new Date().toISOString(),
      summary: newContent.slice(0, 140) + '...',
      content: newContent,
    };

    localStore.saveKnowledgeDoc(newDoc);
    setDocs(localStore.getKnowledgeDocs());
    setNewTitle('');
    setNewContent('');
    setIsAddingDoc(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const results = await ragService.findRelevantSources(searchQuery.trim(), 5);
    setSearchResults(results);
    setIsSearching(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Knowledge Base & Local RAG</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Import production runbooks, architecture specs, and notes for local grounding and citation retrieval.
          </p>
        </div>

        <button
          onClick={() => setIsAddingDoc(!isAddingDoc)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Import Document</span>
        </button>
      </div>

      {/* Semantic Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
          <input
            type="text"
            placeholder="Search local knowledge base chunks (e.g. OOMKilled exit code 137, or multi-region failover)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-200 rounded-xl text-xs font-semibold transition-colors shrink-0"
        >
          {isSearching ? 'Searching...' : 'Search Index'}
        </button>
      </form>

      {/* Search Results Preview */}
      {searchResults.length > 0 && (
        <div className="p-4 bg-neutral-900 border border-indigo-500/40 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs text-indigo-300 font-bold">
            <span>Semantic Search Matches ({searchResults.length})</span>
            <button
              onClick={() => setSearchResults([])}
              className="text-[11px] text-neutral-500 hover:text-neutral-300"
            >
              Clear
            </button>
          </div>
          <div className="space-y-2">
            {searchResults.map((res, i) => (
              <div key={i} className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="font-bold text-white">{res.documentTitle}</span>
                  <span className="text-emerald-400">Relevance: {(res.relevance * 100).toFixed(0)}%</span>
                </div>
                <p className="text-neutral-300 leading-relaxed font-sans">{res.snippet}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Modal / Form */}
      {isAddingDoc && (
        <form onSubmit={handleCreateDocument} className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Import Local Document / Runbook
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-300 block mb-1">Document Title</label>
              <input
                type="text"
                placeholder="e.g. AWS Route 53 ARC Incident Runbook"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-300 block mb-1">Category</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as any)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="runbook">Incident Runbook</option>
                <option value="architecture">Architecture Blueprint</option>
                <option value="cheatsheet">Technical Cheatsheet</option>
                <option value="notes">Interview Notes</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-neutral-300 block mb-1">Content (Markdown or Plain Text)</label>
            <textarea
              rows={8}
              placeholder="Paste document text or notes here..."
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddingDoc(false)}
              className="px-4 py-2 text-xs text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
            >
              Chunk & Index Document
            </button>
          </div>
        </form>
      )}

      {/* Documents List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs.map(doc => (
          <div
            key={doc.id}
            className="p-5 bg-neutral-900/80 border border-neutral-800 rounded-2xl flex flex-col justify-between hover:border-neutral-700 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {doc.category}
                </span>
                <span className="text-neutral-500">{doc.chunksCount} chunks</span>
              </div>
              <h3 className="text-sm font-bold text-white leading-snug">{doc.title}</h3>
              <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed">
                {doc.summary || doc.content.slice(0, 120)}
              </p>
            </div>

            <div className="pt-4 border-t border-neutral-850 flex items-center justify-between mt-4 text-[11px] text-neutral-500 font-mono">
              <span>{Math.round(doc.sizeBytes / 1024)} KB</span>
              <button
                onClick={() => handleDelete(doc.id)}
                className="p-1 hover:text-rose-400 rounded transition-colors"
                title="Delete document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
