import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Copy, Check, Download } from 'lucide-react';

interface MermaidViewerProps {
  chart: string;
  className?: string;
}

export const MermaidViewer: React.FC<MermaidViewerProps> = ({ chart, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        darkMode: true,
        background: '#121217',
        primaryColor: '#6366f1',
        primaryTextColor: '#f8fafc',
        primaryBorderColor: '#4f46e5',
        lineColor: '#64748b',
        secondaryColor: '#1e1e24',
        tertiaryColor: '#18181b',
        fontFamily: "'JetBrains Mono', monospace",
      },
      securityLevel: 'loose',
    });

    const renderChart = async () => {
      if (!chart.trim()) return;
      const uniqueId = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      try {
        setError(null);
        const { svg } = await mermaid.render(uniqueId, chart);
        setSvgContent(svg);
      } catch (err: any) {
        console.warn('Mermaid rendering error:', err);
        setError('Diagram parsing warning. Displaying structured specification.');
      }
    };

    renderChart();
  }, [chart]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSVG = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `system-design-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`relative bg-neutral-900/90 border border-neutral-800 rounded-xl overflow-hidden ${className}`}>
      {/* Action Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800/80 bg-neutral-950/60">
        <span className="text-xs font-mono text-neutral-400">Architecture Flowchart (Mermaid)</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-neutral-300 hover:text-white bg-neutral-800/60 hover:bg-neutral-800 rounded-md transition-colors"
            title="Copy Mermaid Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Spec'}</span>
          </button>
          <button
            onClick={handleDownloadSVG}
            disabled={!svgContent}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-neutral-300 hover:text-white bg-neutral-800/60 hover:bg-neutral-800 rounded-md transition-colors disabled:opacity-40"
            title="Export as Vector SVG"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export SVG</span>
          </button>
        </div>
      </div>

      {/* Rendered SVG or Fallback */}
      <div className="p-6 overflow-x-auto flex justify-center items-center min-h-[280px]">
        {error ? (
          <div className="w-full">
            <div className="text-xs text-amber-400/90 mb-3">{error}</div>
            <pre className="text-xs font-mono text-neutral-300 bg-neutral-950 p-4 rounded-lg overflow-x-auto border border-neutral-800">
              {chart}
            </pre>
          </div>
        ) : svgContent ? (
          <div
            ref={containerRef}
            className="w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:drop-shadow-md"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            Rendering architecture diagram...
          </div>
        )}
      </div>
    </div>
  );
};
