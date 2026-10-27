import React, { useState } from 'react';
import { X, Check, Copy, ExternalLink, Download, Globe, Github, Sparkles } from 'lucide-react';

interface DeployGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeployGuideModal: React.FC<DeployGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1 pr-8">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider">
            <Globe className="w-4 h-4" />
            Permanent Portfolio & Résumé Hosting
          </div>
          <h2 className="text-xl font-bold text-white">
            Publishing to a Permanent URL for your CV
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            The temporary Cloud Run preview link will eventually expire. Here are the 2 fastest ways to get a permanent URL that stays online forever for hiring managers and academic peers.
          </p>
        </div>

        {/* Download Bundle Action */}
        <div className="p-4 bg-slate-950/80 border border-cyan-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-cyan-400" />
              Complete Project Archive (.zip)
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Contains all source code, components, math engine, and the pre-built <code className="text-cyan-300">/dist</code> bundle.
            </div>
          </div>
          <a
            href="./turbofan-aeroacoustics.zip"
            download="turbofan-aeroacoustics.zip"
            className="px-4 py-2 text-xs font-mono font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download ZIP
          </a>
        </div>

        {/* Tab 1: GitHub Pages */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Github className="w-4 h-4 text-slate-200" />
            <h3 className="text-sm font-bold text-white">
              Method 1: GitHub Pages (Recommended for Résumé)
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
              100% Free · URL: your-name.github.io
            </span>
          </div>

          <ol className="space-y-3 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
            <li>
              <strong>Download the project ZIP</strong> above and extract it on your computer.
            </li>
            <li>
              Go to <a href="https://github.com/new" target="_blank" rel="noreferrer" className="text-cyan-400 underline inline-flex items-center gap-1">github.com/new <ExternalLink className="w-3 h-3" /></a> and create a public repository named <code className="text-cyan-300">turbofan-aeroacoustics</code>.
            </li>
            <li>
              Push the extracted project to your new repository:
              <div className="mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-300 relative">
                <code>
                  git init<br />
                  git add .<br />
                  git commit -m "Initial thesis explorer"<br />
                  git branch -M main<br />
                  git remote add origin https://github.com/&lt;your-username&gt;/turbofan-aeroacoustics.git<br />
                  git push -u origin main
                </code>
                <button
                  onClick={() => copyToClipboard('git init\ngit add .\ngit commit -m "Initial thesis explorer"\ngit branch -M main', 1)}
                  className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 text-slate-400 hover:text-white"
                >
                  {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </li>
            <li>
              In your GitHub repo: go to <strong>Settings</strong> → <strong>Pages</strong> → under <strong>Build and deployment</strong>, choose <strong>GitHub Actions</strong> (Vite workflow) or set source to <strong>Deploy from branch</strong>.
            </li>
            <li>
              Your permanent CV URL will be: <code className="text-cyan-300">https://&lt;your-username&gt;.github.io/turbofan-aeroacoustics/</code>
            </li>
          </ol>
        </div>

        {/* Tab 2: Vercel / Netlify Drag & Drop */}
        <div className="space-y-3 border-t border-slate-800 pt-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              Method 2: Netlify Drag & Drop (Zero Code / 30 Seconds)
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
              No Git required
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Extract the ZIP file. Open <a href="https://app.netlify.com/drop" target="_blank" rel="noreferrer" className="text-cyan-400 underline inline-flex items-center gap-1">netlify.com/drop <ExternalLink className="w-3 h-3" /></a> and simply drag the <code className="text-cyan-300">dist</code> folder from the extracted ZIP into your browser window. You immediately receive a permanent live URL you can customize!
          </p>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
