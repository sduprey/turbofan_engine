import React, { useState, useMemo } from 'react';
import { Volume2, AlertOctagon, Layers, Sliders, Maximize2 } from 'lucide-react';
import { calculateDirectivityPattern } from '../utils/acousticsMath';
import { MathView } from './MathView';

interface PolarPoint {
  theta: number; // degrees
  r: number;
}

export const FarFieldDirectivityChart: React.FC = () => {
  const [selectedM, setSelectedM] = useState<number>(0);
  const [selectedN, setSelectedN] = useState<number>(0);
  const [kR, setKR] = useState<number>(2.0);
  const [Minf, setMinf] = useState<number>(0.1);
  const [displayMode, setDisplayMode] = useState<'linear' | 'decibel'>('linear');
  const [hoverAngle, setHoverAngle] = useState<number | null>(45);

  // Curves to compare
  const [showM0, setShowM0] = useState<boolean>(true);
  const [showM1, setShowM1] = useState<boolean>(true);
  const [showM2, setShowM2] = useState<boolean>(true);
  const [showM3, setShowM3] = useState<boolean>(true);

  // Generate 360 degree polar points for each Mach condition
  const polarData = useMemo(() => {
    const angles = Array.from({ length: 361 }, (_, i) => i);
    const mConditions = [
      { id: 'm0', label: 'M_M = 0.0 (No flow)', mm: 0.0, minf: 0.0, color: '#38bdf8', active: showM0 },
      { id: 'm1', label: 'M_M = 0.1 (Base)', mm: 0.1, minf: Minf, color: '#ec4899', active: showM1 },
      { id: 'm2', label: 'M_M = 0.2 (Accelerated)', mm: 0.2, minf: Minf, color: '#22c55e', active: showM2 },
      { id: 'm3', label: 'M_M = 0.3 (High intake)', mm: 0.3, minf: Minf, color: '#eab308', active: showM3 },
    ];

    let maxLinear = 0.01;

    const curves = mConditions.map((cond) => {
      const points = angles.map((theta) => {
        const { directivityLinear, directivityDb } = calculateDirectivityPattern(
          theta,
          selectedM,
          selectedN,
          kR,
          cond.mm,
          cond.minf
        );
        if (directivityLinear > maxLinear) maxLinear = directivityLinear;
        return { theta, linear: directivityLinear, db: directivityDb };
      });
      return { ...cond, points };
    });

    return { curves, maxLinear };
  }, [selectedM, selectedN, kR, Minf, showM0, showM1, showM2, showM3]);

  // Compute delta dB at hoverAngle between M_M = 0 and M_M = 0.3
  const deltaAtAngle = useMemo(() => {
    const angle = hoverAngle !== null ? hoverAngle : 45;
    const p0 = calculateDirectivityPattern(angle, selectedM, selectedN, kR, 0.0, 0.0);
    const p3 = calculateDirectivityPattern(angle, selectedM, selectedN, kR, 0.3, Minf);
    const delta = Math.abs(p3.directivityDb - p0.directivityDb);
    return { angle, delta, db0: p0.directivityDb, db3: p3.directivityDb };
  }, [hoverAngle, selectedM, selectedN, kR, Minf]);

  // SVG coordinate transformation
  const svgCenter = 210;
  const maxRadius = 170;

  const toSvgCoords = (thetaDeg: number, val: number, maxVal: number) => {
    const r = (val / Math.max(1e-4, maxVal)) * maxRadius;
    const rad = (thetaDeg * Math.PI) / 180;
    // Align 0 deg to positive z-axis (right), 90 deg upwards
    const x = svgCenter + r * Math.cos(rad);
    const y = svgCenter - r * Math.sin(rad);
    return { x, y };
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 mb-1 flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            Chapter 5.5: Acoustic Directivity & Far-Field Radiation
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Far-Field Radiation Polar Diagrams & The 5+ dB Discrepancy
          </h3>
          <p className="text-sm text-slate-400 mt-0.5">
            Asymptotic representation <MathView math="\phi_a(r,\theta) \approx \frac{e^{ik'_\infty r}}{4\pi r} A(\theta)" /> under increasing nacelle lip flow acceleration.
          </p>
        </div>

        {/* Display mode buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-lg">
            <button
              onClick={() => setDisplayMode('linear')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                displayMode === 'linear'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Linear |A(θ)|
            </button>
            <button
              onClick={() => setDisplayMode('decibel')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                displayMode === 'decibel'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Decibels dB(θ)
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left: Polar Chart SVG */}
        <div className="lg:col-span-7 p-6 bg-slate-950/60 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col items-center justify-center">
          <div className="w-full max-w-[460px] aspect-square relative bg-slate-950 rounded-lg border border-slate-800 p-2">
            <svg
              viewBox="0 0 420 420"
              className="w-full h-full overflow-visible select-none cursor-crosshair"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = -(e.clientY - rect.top - rect.height / 2);
                let deg = Math.round((Math.atan2(y, x) * 180) / Math.PI);
                if (deg < 0) deg += 360;
                setHoverAngle(deg);
              }}
            >
              {/* Concentric Polar Grid Rings */}
              {[0.25, 0.5, 0.75, 1.0].map((frac, idx) => (
                <circle
                  key={idx}
                  cx={svgCenter}
                  cy={svgCenter}
                  r={maxRadius * frac}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeDasharray="2,2"
                />
              ))}

              {/* Radial spoke lines */}
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const x2 = svgCenter + maxRadius * Math.cos(rad);
                const y2 = svgCenter - maxRadius * Math.sin(rad);
                const tx = svgCenter + (maxRadius + 14) * Math.cos(rad);
                const ty = svgCenter - (maxRadius + 14) * Math.sin(rad);
                return (
                  <g key={deg}>
                    <line
                      x1={svgCenter}
                      y1={svgCenter}
                      x2={x2}
                      y2={y2}
                      stroke="rgba(255, 255, 255, 0.1)"
                      strokeWidth="1"
                    />
                    <text
                      x={tx}
                      y={ty + 4}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                      textAnchor="middle"
                    >
                      {deg}°
                    </text>
                  </g>
                );
              })}

              {/* Central axes */}
              <line x1={svgCenter - maxRadius} y1={svgCenter} x2={svgCenter + maxRadius} y2={svgCenter} stroke="#475569" strokeWidth="1" />
              <line x1={svgCenter} y1={svgCenter - maxRadius} x2={svgCenter} y2={svgCenter + maxRadius} stroke="#475569" strokeWidth="1" />

              {/* Polar Directivity Curves */}
              {polarData.curves.map((curve) => {
                if (!curve.active) return null;

                const pathData = curve.points
                  .map((p, i) => {
                    let val = p.linear;
                    let maxVal = polarData.maxLinear;
                    if (displayMode === 'decibel') {
                      // Normalize dB to [0, 40] range for polar plotting
                      val = Math.max(0, p.db + 30);
                      maxVal = 40;
                    }
                    const { x, y } = toSvgCoords(p.theta, val, maxVal);
                    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                  })
                  .join(' ');

                return (
                  <path
                    key={curve.id}
                    d={pathData}
                    fill={curve.color}
                    fillOpacity="0.08"
                    stroke={curve.color}
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                );
              })}

              {/* Hover probe ray */}
              {hoverAngle !== null && (
                <>
                  <line
                    x1={svgCenter}
                    y1={svgCenter}
                    x2={svgCenter + maxRadius * Math.cos((hoverAngle * Math.PI) / 180)}
                    y2={svgCenter - maxRadius * Math.sin((hoverAngle * Math.PI) / 180)}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="3,3"
                  />
                </>
              )}
            </svg>

            {/* In-chart Probe readout */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur border border-slate-700 px-3 py-2 rounded-md text-xs font-mono">
              <div className="text-slate-400">
                Probe Angle: <span className="text-amber-400 font-bold">{deltaAtAngle.angle}°</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-slate-300">Δ Directivity:</span>
                <span className={`font-bold ${deltaAtAngle.delta > 5.0 ? 'text-rose-400' : 'text-cyan-400'}`}>
                  {deltaAtAngle.delta.toFixed(2)} dB
                </span>
                {deltaAtAngle.delta > 5.0 && (
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-sans font-medium">
                    &gt; 5 dB Certification Alert!
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-400 font-mono text-center">
            Polar Directivity Diagram |A(θ)| vs Angle θ (reproduced from Thesis Page 123)
          </div>
        </div>

        {/* Right: Parameters & Regulatory Impact */}
        <div className="lg:col-span-5 p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Condition Checkboxes */}
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-2">
                Carrier Flow Mach Configurations
              </span>
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2.5 p-2 bg-slate-950/60 rounded border border-slate-800 cursor-pointer hover:bg-slate-950">
                  <input
                    type="checkbox"
                    checked={showM0}
                    onChange={(e) => setShowM0(e.target.checked)}
                    className="accent-cyan-400 rounded"
                  />
                  <span className="w-3 h-3 rounded-full bg-sky-400 shrink-0" />
                  <span className="font-mono text-slate-200">M_M = 0.0</span>
                  <span className="text-slate-500 text-[11px] ml-auto">No flow reference</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 bg-slate-950/60 rounded border border-slate-800 cursor-pointer hover:bg-slate-950">
                  <input
                    type="checkbox"
                    checked={showM1}
                    onChange={(e) => setShowM1(e.target.checked)}
                    className="accent-pink-400 rounded"
                  />
                  <span className="w-3 h-3 rounded-full bg-pink-500 shrink-0" />
                  <span className="font-mono text-slate-200">M_M = 0.1</span>
                  <span className="text-slate-500 text-[11px] ml-auto">Uniform baseline</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 bg-slate-950/60 rounded border border-slate-800 cursor-pointer hover:bg-slate-950">
                  <input
                    type="checkbox"
                    checked={showM2}
                    onChange={(e) => setShowM2(e.target.checked)}
                    className="accent-emerald-400 rounded"
                  />
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-mono text-slate-200">M_M = 0.2</span>
                  <span className="text-slate-500 text-[11px] ml-auto">Accelerated intake</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 bg-slate-950/60 rounded border border-slate-800 cursor-pointer hover:bg-slate-950">
                  <input
                    type="checkbox"
                    checked={showM3}
                    onChange={(e) => setShowM3(e.target.checked)}
                    className="accent-yellow-400 rounded"
                  />
                  <span className="w-3 h-3 rounded-full bg-yellow-500 shrink-0" />
                  <span className="font-mono text-slate-200">M_M = 0.3</span>
                  <span className="text-slate-500 text-[11px] ml-auto">High intake throttle</span>
                </label>
              </div>
            </div>

            {/* Mode & Wavenumber selection */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs text-slate-300 mb-1 block">Acoustic Mode</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedM(0);
                      setSelectedN(0);
                    }}
                    className={`flex-1 py-1.5 text-xs font-mono rounded border transition-all ${
                      selectedM === 0 && selectedN === 0
                        ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    (0, 0) Plane
                  </button>
                  <button
                    onClick={() => {
                      setSelectedM(1);
                      setSelectedN(0);
                    }}
                    className={`flex-1 py-1.5 text-xs font-mono rounded border transition-all ${
                      selectedM === 1 && selectedN === 0
                        ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    (1, 0) Dipole
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 mb-1 block">Wavenumber kR</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setKR(2.0)}
                    className={`flex-1 py-1.5 text-xs font-mono rounded border transition-all ${
                      kR === 2.0
                        ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    kR = 2 (Base)
                  </button>
                  <button
                    onClick={() => setKR(60.0)}
                    className={`flex-1 py-1.5 text-xs font-mono rounded border transition-all ${
                      kR === 60.0
                        ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    kR = 60 (Pencil)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Core Thesis Finding / Regulatory Certification */}
          <div className="p-4 bg-amber-950/20 border border-amber-900/40 rounded-lg space-y-2 text-xs text-amber-200/90">
            <div className="flex items-center gap-1.5 font-semibold text-amber-300">
              <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Industrial Impact: The 5 dB Takeoff Rule</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              International civil aviation standards (ICAO Annex 16) penalize aircraft noise <strong className="text-amber-300">to within a single decibel</strong> at takeoff.
            </p>
            <p className="leading-relaxed text-slate-300">
              Stefan Duprey’s original simulations with PA2R demonstrated that non-linear carrier flow acceleration over the intake lip distorts far-field directivity by <strong className="text-amber-300">&gt; 5 dB</strong>. Simulating noise with a naive uniform flow or without the potential lip gradient fails certification predictions!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
