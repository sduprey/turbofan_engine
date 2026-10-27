import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, GraduationCap, Building2, Users } from 'lucide-react';

interface BibtexModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BibtexModal: React.FC<BibtexModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const bibtexCode = `@phdthesis{duprey2006etude,
  title        = {Etude mathématique et numérique de la propagation acoustique d'un turboréacteur},
  author       = {Duprey, Stefan},
  school       = {Université Henri Poincaré - Nancy 1},
  year         = {2006},
  month        = {December},
  type         = {Thèse de doctorat en Mathématiques Appliquées},
  number       = {NNT : 2006NAN10185},
  url          = {https://tel.archives-ouvertes.fr/tel-01746556v2},
  institution  = {EADS-CCR Suresnes / INRIA Lorraine / Institut Élie Cartan Nancy},
  note         = {CIFRE EADS Corporate Research Center}
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bibtexCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Academic Dissertation Details</h3>
              <p className="text-xs text-slate-400">Université Henri Poincaré - Nancy 1 & EADS-CCR Suresnes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs">
          {/* Thesis metadata */}
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
            <div className="font-semibold text-white text-sm">
              Etude mathématique et numérique de la propagation acoustique d'un turboréacteur
            </div>
            <div className="text-slate-400 space-y-1">
              <div><strong>Author:</strong> Dr. Stefan Duprey</div>
              <div><strong>Specialty:</strong> Applied Mathematics (Mathématiques Appliquées)</div>
              <div><strong>Defense Date:</strong> 2006 · NNT: 2006NAN10185</div>
              <div><strong>HAL ID:</strong> <span className="font-mono text-cyan-300">tel-01746556v2</span></div>
            </div>
            <div className="pt-2">
              <a
                href="https://tel.archives-ouvertes.fr/tel-01746556v2"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-cyan-400 hover:underline font-mono"
              >
                <span>View on HAL Archives Ouvertes</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Jury Composition */}
          <div className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Doctoral Examination Committee (Composition du Jury)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800">
                <span className="text-cyan-300 font-semibold block">Anne-Sophie Bonnet-Ben Dhia</span>
                <span className="text-slate-400">Rapporteur · CR1 CNRS HDR, INRIA-ENSTA Paris</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800">
                <span className="text-cyan-300 font-semibold block">Christophe Bailly</span>
                <span className="text-slate-400">Rapporteur · Professeur, ECL Lyon</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800">
                <span className="text-cyan-300 font-semibold block">Isabelle Terrasse</span>
                <span className="text-slate-400">Examinatrice · Ingénieure de recherche, EADS-CCR Paris</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800">
                <span className="text-cyan-300 font-semibold block">François Dubois</span>
                <span className="text-slate-400">Examinateur · Professeur, CNAM Paris</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800">
                <span className="text-cyan-300 font-semibold block">Karim Ramdani</span>
                <span className="text-slate-400">Examinateur · CR1 INRIA, IECN Nancy</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800">
                <span className="text-cyan-300 font-semibold block">Antoine Henrot</span>
                <span className="text-slate-400">Directeur de thèse · Professeur, EMN-INPL Nancy</span>
              </div>
            </div>
          </div>

          {/* BibTeX Code block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                BibTeX Entry
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-mono text-[11px] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy BibTeX'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto select-all">
              {bibtexCode}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
