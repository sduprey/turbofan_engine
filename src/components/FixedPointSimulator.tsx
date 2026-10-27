import React, { useState, useMemo } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, Gauge } from 'lucide-react';
import { flowDensity, fixedPointIteration } from '../utils/acousticsMath';
import { MathView } from './MathView';

export const FixedPointSimulator: React.FC = () => {
  const [q, setQ] = useState<number>(0.3);
  const [Minf, setMinf] = useState<number>(0.1);
  const [gamma] = useState<number>(1.4);

  // Compute sonic speed limit c_* Eq (4.35)
  const cStar = useMemo(() => {
    return Math.sqrt((2 / (gamma + 1)) * (1 + ((gamma - 1) / 2) * Minf * Minf));
  }, [Minf, gamma]);

  // Run fixed point iteration algorithm
  const simResult = useMemo(() => {
    return fixedPointIteration(q, Minf, 25, gamma);
  }, [q, Minf, gamma]);

  // Generate curves for cobweb diagram: x in [0, 1.6], y = x vs y = f_q(x) = q / F_infty(x)
  const points = useMemo(() => {
    const pts: { v: number; fq: number }[] = [];
    const maxV = 1.6;
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const v = (i / steps) * maxV;
      const rho = flowDensity(v, Minf, gamma);
      const fq = rho > 0.05 ? q / rho : 2.5;
      pts.push({ v, fq });
    }
    return pts;
  }, [q, Minf, gamma]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 mb-1 flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            Chapter 4.2.1: Non-Linear Potential Flow & Fixed-Point Solver
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Subsonic Potential Flow & Nečas Fixed-Point Convergence
          </h3>
          <p className="text-sm text-slate-400 mt-0.5">
            Solving <MathView math="\operatorname{div}\left(F_\infty(|\nabla \phi_0|^2)\nabla \phi_0\right) = 0" /> via iterative scheme <MathView math="v_{k+1} = \frac{q}{F_\infty(v_k)}" />.
          </p>
        </div>

        {/* Quick presets matching Thesis Page 68 */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400 mr-1">Thesis Presets:</span>
          <button
            onClick={() => {
              setQ(0.3);
              setMinf(0.1);
            }}
            className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all ${
              q === 0.3
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            q = 0.3 (Fast)
          </button>
          <button
            onClick={() => {
              setQ(0.7);
              setMinf(0.1);
            }}
            className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all ${
              q === 0.7
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            q = 0.7 (Near Sonic)
          </button>
          <button
            onClick={() => {
              setQ(0.88);
              setMinf(0.1);
            }}
            className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-all ${
              q > 0.8
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            q = 0.88 (Divergent)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left: Interactive Cobweb Diagram SVG */}
        <div className="lg:col-span-7 p-6 bg-slate-950/60 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col items-center justify-center">
          <div className="w-full max-w-[500px] aspect-[5/4] relative bg-slate-950 rounded-lg border border-slate-800 p-4">
            <svg viewBox="0 0 440 340" className="w-full h-full overflow-visible">
              {/* Coordinate Grid */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect x="50" y="20" width="360" height="270" fill="url(#grid)" />

              {/* Axes */}
              <line x1="50" y1="290" x2="420" y2="290" stroke="#64748b" strokeWidth="1.5" />
              <line x1="50" y1="20" x2="50" y2="290" stroke="#64748b" strokeWidth="1.5" />

              {/* Ticks and Labels */}
              <text x="50" y="308" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono" textAnchor="middle">0.0</text>
              <text x="140" y="308" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono" textAnchor="middle">0.4</text>
              <text x="230" y="308" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono" textAnchor="middle">0.8</text>
              <text x="320" y="308" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono" textAnchor="middle">1.2</text>
              <text x="410" y="308" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono" textAnchor="middle">1.6</text>
              <text x="425" y="294" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono">v_k</text>

              <text x="40" y="293" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono" textAnchor="end">0.0</text>
              <text x="40" y="225" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono" textAnchor="end">0.5</text>
              <text x="40" y="157" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono" textAnchor="end">1.0</text>
              <text x="40" y="90" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono" textAnchor="end">1.5</text>
              <text x="40" y="24" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono" textAnchor="end">2.0</text>
              <text x="55" y="15" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono">v_{'{k+1}'}</text>

              {/* Sonic threshold line c_* */}
              {cStar < 1.6 && (
                <>
                  <line
                    x1={50 + (cStar / 1.6) * 360}
                    y1="20"
                    x2={50 + (cStar / 1.6) * 360}
                    y2="290"
                    stroke="#f43f5e"
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                  />
                  <text
                    x={50 + (cStar / 1.6) * 360}
                    y="35"
                    fill="#f43f5e"
                    fontSize="10"
                    fontFamily="JetBrains Mono"
                    textAnchor="middle"
                    className="font-semibold"
                  >
                    c* = {cStar.toFixed(2)} (Sonic)
                  </text>
                </>
              )}

              {/* Diagonal y = x */}
              <line x1="50" y1="290" x2="410" y2="74" stroke="#475569" strokeWidth="1.5" strokeDasharray="3,3" />

              {/* Curve y = f_q(x) = q / F_infty(x) */}
              <path
                d={points
                  .filter((p) => p.fq <= 2.2)
                  .map((p, idx) => {
                    const sx = 50 + (p.v / 1.6) * 360;
                    const sy = 290 - (p.fq / 2.0) * 270;
                    return `${idx === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)}`;
                  })
                  .join(' ')}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
              />

              {/* Cobweb Iteration Steps */}
              {simResult.steps.map((st, i) => {
                if (st.v_in > 1.6 || st.v_out > 2.0) return null;
                const xIn = 50 + (st.v_in / 1.6) * 360;
                const yOut = 290 - (st.v_out / 2.0) * 270;
                const xNext = 50 + (st.v_out / 1.6) * 360;
                const yNext = 290 - (st.v_out / 2.0) * 270;

                return (
                  <g key={i}>
                    {/* Vertical step from (v_k, v_k) to (v_k, v_{k+1}) */}
                    <line
                      x1={xIn}
                      y1={i === 0 ? 290 : 290 - (st.v_in / 2.0) * 270}
                      x2={xIn}
                      y2={yOut}
                      stroke="#22c55e"
                      strokeWidth="2"
                    />
                    {/* Horizontal step from (v_k, v_{k+1}) to (v_{k+1}, v_{k+1}) */}
                    <line
                      x1={xIn}
                      y1={yOut}
                      x2={xNext}
                      y2={yNext}
                      stroke="#eab308"
                      strokeWidth="1.5"
                      strokeDasharray="2,2"
                    />
                    {/* Iteration point */}
                    <circle cx={xIn} cy={yOut} r="3" fill="#22c55e" />
                  </g>
                );
              })}
            </svg>

            {/* Legend / Status Pill */}
            <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-700 px-3 py-1.5 rounded-md text-xs font-mono flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
              <span className="text-slate-300">f_q(v) = q / F_∞(v)</span>
              <span className="text-slate-500">|</span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
              <span className="text-slate-300">Cobweb Steps</span>
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-400 font-mono text-center">
            Figure directly reproduced from Stefan Duprey's thesis (Page 68: "Débit et convergence du point fixe")
          </div>
        </div>

        {/* Right: Controls & Proof Breakdown */}
        <div className="lg:col-span-5 p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Sliders */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Imposed Mass Flux (Débit q)</span>
                <span className="font-mono text-cyan-300 font-bold tabular-nums">q = {q.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.92"
                step="0.01"
                value={q}
                onChange={(e) => setQ(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-0.5">
                <span>0.10 (Gentle)</span>
                <span>0.70 (Thesis boundary)</span>
                <span>0.92 (Transonic barrier)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Far-Field Mach Number M_∞</span>
                <span className="font-mono text-cyan-300 font-bold tabular-nums">M_∞ = {Minf.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.00"
                max="0.35"
                step="0.01"
                value={Minf}
                onChange={(e) => setMinf(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-0.5">
                <span>0.00 (Static test bench)</span>
                <span>0.10 (Takeoff taxi)</span>
                <span>0.35 (Climb)</span>
              </div>
            </div>

            {/* Iteration Outcome Box */}
            <div className={`p-4 rounded-lg border text-xs space-y-2 ${
              simResult.converged
                ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                : 'bg-rose-950/20 border-rose-800/40 text-rose-200'
            }`}>
              <div className="flex items-center gap-2 font-semibold">
                {simResult.converged ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Fixed Point Converged in {simResult.steps.length} Iterations</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Transonic Blow-Up / Divergence</span>
                  </>
                )}
              </div>
              <div className="font-mono text-[11px] space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span>Equilibrium Velocity v*:</span>
                  <span className="text-white font-bold">{simResult.converged ? simResult.finalV.toFixed(5) : 'DIVERGED'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sonic Limit c*:</span>
                  <span className="text-slate-400">{cStar.toFixed(5)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Convexity Status:</span>
                  <span className={simResult.converged ? 'text-emerald-400' : 'text-rose-400'}>
                    {simResult.converged ? '||∇φ₀||_∞ ≤ δ < c* (Strictly Convex)' : 'Constraint Saturated (Non-convex)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mathematical Rationale from Nečas Theorem */}
          <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-lg space-y-2 text-xs text-slate-400">
            <div className="text-cyan-400 font-semibold flex items-center gap-1.5">
              <span>Nečas Fixed-Point Theorem (Theorem 4.2.3)</span>
            </div>
            <p className="leading-relaxed">
              Stefan Duprey proved that on the closed convex set <MathView math="K_\delta = \{ v \in W^{1,\infty}(\Omega)/\mathbb{R}, \|\nabla v\|_\infty \le \delta < c_* \}" />, the non-linear potential functional <MathView math="K(\phi_0) = J(\phi_0) - \int_{\partial\Omega} q\phi_0 d\gamma" /> is strictly elliptic and coercive.
            </p>
            <div className="text-[11px] font-mono text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800">
              <MathView math="\exists \alpha > 0, \quad \nabla^2 K(\phi_0)(\psi, \psi) \ge \alpha \|\psi\|_{H^1(\Omega)/\mathbb{R}}^2" display={true} />
            </div>
            <p className="text-[11px] text-slate-400">
              This guarantees that parallel iteration converges unconditionally to the unique physical solution without needing costly non-linear optimization or artificial viscosity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
