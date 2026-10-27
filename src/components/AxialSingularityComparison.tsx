import React, { useState, useMemo } from 'react';
import { Sparkles, Check, AlertCircle, ArrowRight, ShieldCheck, TrendingDown } from 'lucide-react';
import { MathView } from './MathView';

export const AxialSingularityComparison: React.FC = () => {
  const [selectedBeta, setSelectedBeta] = useState<number>(0);
  const [selectedAlpha, setSelectedAlpha] = useState<'1/4' | '1/3' | '2/3'>('1/4');
  const [meshSize, setMeshSize] = useState<'31' | '71'>('31');
  const [viewMode, setViewMode] = useState<'isovals' | 'convergence'>('isovals');

  // Convergence data points from Figure 3 (page 103)
  // log2(N) vs log2(||u - u_h||)
  const convergenceData = useMemo(() => {
    return [
      { logN: 2, mrL2: -1.2, ddL2: -3.8, mrH1: 0.8, ddH1: -0.4, mrInf: -0.6, ddInf: -2.8 },
      { logN: 3, mrL2: -2.5, ddL2: -6.4, mrH1: -0.2, ddH1: -1.9, mrInf: -1.8, ddInf: -4.5 },
      { logN: 4, mrL2: -3.9, ddL2: -9.1, mrH1: -1.1, ddH1: -3.4, mrInf: -3.0, ddInf: -6.2 },
      { logN: 5, mrL2: -5.2, ddL2: -11.8, mrH1: -2.0, ddH1: -4.9, mrInf: -4.2, ddInf: -7.9 },
    ];
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 mb-1 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Chapter 5.1: Axial Singularity Resolution
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Natural Weighted Sobolev Element vs Mercier-Raugel
          </h3>
          <p className="text-sm text-slate-400 mt-0.5">
            Eliminating the <MathView math="m^2 \int_\Omega \frac{p p'}{r} dr dz" /> singularity at the axis <MathView math="r = 0" /> without spurious boundary layers.
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-lg">
          <button
            onClick={() => setViewMode('isovals')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === 'isovals'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Isovalues at Axis (Fig 1-2)
          </button>
          <button
            onClick={() => setViewMode('convergence')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === 'convergence'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Convergence Curves (Fig 3)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Interactive Comparison Stage */}
        <div className="lg:col-span-7 p-6 bg-slate-950/70 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col items-center justify-center">
          {viewMode === 'isovals' ? (
            <div className="w-full max-w-[500px] flex flex-col items-center">
              {/* Dual Visual Panels: Mercier-Raugel (MR) vs Stefan Duprey (DD) */}
              <div className="w-full grid grid-cols-2 gap-3">
                {/* Mercier-Raugel Box */}
                <div className="bg-slate-950 rounded-lg border border-slate-800 p-3 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="text-xs font-mono font-bold text-slate-400">Mercier-Raugel (MR)</span>
                    <span className="text-[10px] text-rose-400 font-mono">Axis Artifacts</span>
                  </div>
                  <div className="w-full aspect-square relative bg-slate-900/60 rounded border border-slate-800 overflow-hidden flex items-center justify-center">
                    <svg viewBox="0 0 160 160" className="w-full h-full">
                      {/* Grid */}
                      <line x1="20" y1="10" x2="20" y2="150" stroke="#f43f5e" strokeWidth="2" />
                      <text x="24" y="24" fill="#f43f5e" fontSize="9" fontFamily="JetBrains Mono">r=0</text>
                      
                      {/* Distorted isovalue lines near axis for MR */}
                      {[30, 50, 70, 90, 110, 130].map((baseY, i) => {
                        const bend = meshSize === '31' ? 22 : 10;
                        const d = selectedBeta === 0
                          ? `M 20 ${baseY} C 30 ${baseY - bend}, 40 ${baseY}, 150 ${baseY}`
                          : `M 20 ${baseY} C 35 ${baseY - bend}, 60 ${baseY + 10}, 150 ${baseY + 20}`;
                        return (
                          <path
                            key={i}
                            d={d}
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="1.2"
                            strokeDasharray={i % 2 === 0 ? 'none' : '3,2'}
                          />
                        );
                      })}
                      {/* Sharp artificial boundary layer highlight */}
                      <rect x="20" y="20" width={meshSize === '31' ? "24" : "12"} height="120" fill="rgba(244, 63, 94, 0.12)" />
                    </svg>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-2 text-center">
                    Forced <MathView math="u(0,z)=0" /> creates false gradient layer at axis
                  </span>
                </div>

                {/* Stefan Duprey (DD) Box */}
                <div className="bg-slate-950 rounded-lg border border-cyan-500/40 p-3 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="text-xs font-mono font-bold text-cyan-300">Duprey Method (DD)</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Clean Asymptotics</span>
                  </div>
                  <div className="w-full aspect-square relative bg-slate-900/60 rounded border border-slate-800 overflow-hidden flex items-center justify-center">
                    <svg viewBox="0 0 160 160" className="w-full h-full">
                      {/* Grid */}
                      <line x1="20" y1="10" x2="20" y2="150" stroke="#38bdf8" strokeWidth="2" />
                      <text x="24" y="24" fill="#38bdf8" fontSize="9" fontFamily="JetBrains Mono">r=0</text>

                      {/* Smooth exact analytic isovalues */}
                      {[30, 50, 70, 90, 110, 130].map((baseY, i) => {
                        const d = selectedBeta === 0
                          ? `M 20 ${baseY} L 150 ${baseY}`
                          : `M 20 ${baseY} Q 60 ${baseY + 8}, 150 ${baseY + 20}`;
                        return (
                          <path
                            key={i}
                            d={d}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="1.5"
                          />
                        );
                      })}
                    </svg>
                  </div>
                  <span className="text-[10px] text-cyan-300 mt-2 text-center">
                    Natural <MathView math="u \sim \tilde{\alpha}\sqrt{r}" />: matches analytic solution exactly
                  </span>
                </div>
              </div>

              {/* Grid resolution selector */}
              <div className="mt-4 flex items-center gap-3 text-xs">
                <span className="text-slate-400">Mesh Resolution:</span>
                <button
                  onClick={() => setMeshSize('31')}
                  className={`px-3 py-1 font-mono rounded border transition-all ${
                    meshSize === '31'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  31 × 31 Coarse Mesh
                </button>
                <button
                  onClick={() => setMeshSize('71')}
                  className={`px-3 py-1 font-mono rounded border transition-all ${
                    meshSize === '71'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  71 × 71 Refined Mesh
                </button>
              </div>
            </div>
          ) : (
            /* Log-log error convergence chart */
            <div className="w-full max-w-[480px] bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                <span>Error Convergence: log₂(||u - u_h||) vs log₂(N)</span>
                <span className="text-cyan-400">Order ~ 3 in L²</span>
              </div>
              <svg viewBox="0 0 380 240" className="w-full h-auto">
                {/* Axes */}
                <line x1="40" y1="20" x2="40" y2="210" stroke="#64748b" strokeWidth="1.5" />
                <line x1="40" y1="210" x2="360" y2="210" stroke="#64748b" strokeWidth="1.5" />

                {/* Gridlines */}
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <line
                    key={idx}
                    x1="40"
                    y1={30 + idx * 34}
                    x2="360"
                    y2={30 + idx * 34}
                    stroke="rgba(255,255,255,0.05)"
                    strokeDasharray="2,2"
                  />
                ))}

                {/* X labels */}
                {[2, 3, 4, 5].map((val) => (
                  <text key={val} x={40 + (val - 2) * 100} y="226" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
                    N = 2^{val}
                  </text>
                ))}

                {/* Mercier-Raugel curve (slower convergence, higher error) */}
                <path
                  d={convergenceData
                    .map((d, i) => {
                      const x = 40 + (d.logN - 2) * 100;
                      const y = 50 - d.mrL2 * 12;
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeDasharray="4,4"
                />

                {/* Stefan Duprey curve (steep slope, significantly lower error) */}
                <path
                  d={convergenceData
                    .map((d, i) => {
                      const x = 40 + (d.logN - 2) * 100;
                      const y = 50 - d.ddL2 * 12;
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                />

                {/* Points */}
                {convergenceData.map((d, i) => (
                  <g key={i}>
                    <circle cx={40 + (d.logN - 2) * 100} cy={50 - d.mrL2 * 12} r="4" fill="#94a3b8" />
                    <circle cx={40 + (d.logN - 2) * 100} cy={50 - d.ddL2 * 12} r="4" fill="#38bdf8" />
                  </g>
                ))}
              </svg>

              <div className="flex items-center justify-center gap-6 mt-2 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-3 h-0.5 bg-slate-400 inline-block stroke-dasharray" />
                  <span>Mercier-Raugel (Standard FEM)</span>
                </div>
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
                  <span>Duprey Natural Weighted Element (DD)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Mathematical Formulation & Parameters */}
        <div className="lg:col-span-5 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="border-b border-slate-800 pb-3 mb-3">
              <span className="text-xs font-mono text-cyan-400 uppercase">Test Case Configuration</span>
              <h4 className="text-lg font-bold text-white tracking-tight mt-0.5">
                Exact Solution <MathView math="u(r,z) = r^\alpha z^\beta" />
              </h4>
            </div>

            {/* Parameter Buttons */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Axial Variation Power β (Z-dependence):
                </label>
                <div className="flex gap-2">
                  {[0, 1, 2].map((b) => (
                    <button
                      key={b}
                      onClick={() => setSelectedBeta(b)}
                      className={`flex-1 py-1.5 text-xs font-mono rounded border transition-all ${
                        selectedBeta === b
                          ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      β = {b} {b === 0 ? '(Constant)' : b === 1 ? '(Linear)' : '(Quadratic)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Radial Singularity Exponent α:
                </label>
                <div className="flex gap-2">
                  {(['1/4', '1/3', '2/3'] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => setSelectedAlpha(a)}
                      className={`flex-1 py-1.5 text-xs font-mono rounded border transition-all ${
                        selectedAlpha === a
                          ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      α = {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* The Mathematical Insight */}
            <div className="mt-4 p-3 bg-slate-950 rounded border border-slate-800 space-y-2 text-xs">
              <span className="text-cyan-400 font-semibold block">
                The Natural Element Basis Space X_T (Eq 5.10 - 5.11):
              </span>
              <div className="text-slate-200 font-mono text-center py-1">
                <MathView math="\tilde{u}_T(r, z) = \tilde{\alpha}\sqrt{r} + \tilde{\beta}r\sqrt{r} + \tilde{\gamma}\sqrt{r}z" display={true} />
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Whereas classical elements enforce <MathView math="u_T = \alpha + \beta r + \gamma z" /> with <MathView math="u(0)=0" /> (wiping out DoFs on the axis), Stefan Duprey's basis functions provide a dedicated degree of freedom on each axis node: the coefficient <MathView math="\tilde{\alpha}" /> of <MathView math="\sqrt{r}" />.
              </p>
            </div>
          </div>

          <div className="p-3 bg-cyan-950/20 border border-cyan-900/40 rounded-lg text-xs text-slate-300">
            <span className="text-cyan-300 font-semibold block mb-0.5">
              Numerical Result from Thesis (Page 100):
            </span>
            "Our approach is already extremely accurate on a coarse 31×31 mesh: the natural degrees of freedom on the axis completely suppress axis distortion, and the computed numerical solution is graphically indistinguishable from the exact analytic solution."
          </div>
        </div>
      </div>
    </div>
  );
};
