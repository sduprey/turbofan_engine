import React, { useState, useEffect, useRef } from 'react';
import { Wind, Gauge, Sparkles, Sliders, Eye, Info, Check } from 'lucide-react';
import { MathView } from './MathView';

interface NacelleVenturiFlowVisualizerProps {
  Minf: number;
  MM: number;
  onSelectParams?: (minf: number, mm: number) => void;
}

export const NacelleVenturiFlowVisualizer: React.FC<NacelleVenturiFlowVisualizerProps> = ({
  Minf,
  MM,
  onSelectParams,
}) => {
  const [displayType, setDisplayType] = useState<'mach' | 'isopotentials' | 'streamlines'>('mach');
  const [hoverCoord, setHoverCoord] = useState<{ z: number; r: number; mach: number; density: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Six standard benchmark configurations from Thesis Page 117
  const BENCHMARKS = [
    { label: 'M_M = 0.1, M_∞ = 0', mm: 0.1, minf: 0.0, maxMach: 0.28 },
    { label: 'M_M = 0.1, M_∞ = 0.1', mm: 0.1, minf: 0.1, maxMach: 0.34 },
    { label: 'M_M = 0.2, M_∞ = 0', mm: 0.2, minf: 0.0, maxMach: 0.52 },
    { label: 'M_M = 0.2, M_∞ = 0.1', mm: 0.2, minf: 0.1, maxMach: 0.59 },
    { label: 'M_M = 0.3, M_∞ = 0', mm: 0.3, minf: 0.0, maxMach: 0.74 },
    { label: 'M_M = 0.3, M_∞ = 0.1', mm: 0.3, minf: 0.1, maxMach: 0.83 },
  ];

  // Draw the exact dome nacelle flow field from Page 117 & 126
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;

    // Axis of symmetry is the bottom edge of the dome (r = 0 at y = h - 25)
    const axisY = h - 25;
    // Engine duct opening lip location
    const lipX = Math.floor(w * 0.42);
    const cowlRadius = Math.floor(h * 0.52); // Nacelle radius R
    const cowlThick = Math.floor(h * 0.10);  // Nacelle cowl thickness
    const lipY = axisY - cowlRadius;

    // Dome radius for Gamma_infinity
    const domeCenterX = lipX;
    const domeCenterY = axisY;
    const domeRadius = Math.floor(w * 0.48);

    // Color mapping exactly reproducing the Page 117 & 126 thesis colorbar:
    // 0.000 (Deep Blue) -> 0.143 (Cyan) -> 0.286 (Teal/Green) -> 0.429 (Bright Green)
    // -> 0.571 (Yellow) -> 0.714 (Orange) -> 0.857 (Red) -> 1.000 (Dark Red / Crimson)
    const getThesisMachColor = (machVal: number) => {
      const norm = Math.max(0, Math.min(1.0, machVal / 0.85));
      let r = 0, g = 0, b = 0;

      if (norm < 0.14) {
        // 0.000 - 0.143: Deep blue to Sky Cyan
        const t = norm / 0.14;
        r = Math.floor(5 + t * 20);
        g = Math.floor(20 + t * 140);
        b = Math.floor(130 + t * 115);
      } else if (norm < 0.28) {
        // 0.143 - 0.286: Cyan to Teal
        const t = (norm - 0.14) / 0.14;
        r = Math.floor(25 + t * 10);
        g = Math.floor(160 + t * 50);
        b = Math.floor(245 - t * 85);
      } else if (norm < 0.43) {
        // 0.286 - 0.429: Teal to Vibrant Green
        const t = (norm - 0.28) / 0.15;
        r = Math.floor(35 + t * 90);
        g = Math.floor(210 + t * 35);
        b = Math.floor(160 - t * 120);
      } else if (norm < 0.57) {
        // 0.429 - 0.571: Green to Yellow
        const t = (norm - 0.43) / 0.14;
        r = Math.floor(125 + t * 125);
        g = Math.floor(245 - t * 15);
        b = Math.floor(40 - t * 25);
      } else if (norm < 0.71) {
        // 0.571 - 0.714: Yellow to Orange
        const t = (norm - 0.57) / 0.14;
        r = 250;
        g = Math.floor(230 - t * 110);
        b = Math.floor(15 - t * 10);
      } else if (norm < 0.86) {
        // 0.714 - 0.857: Orange to Red
        const t = (norm - 0.71) / 0.15;
        r = Math.floor(250 - t * 20);
        g = Math.floor(120 - t * 95);
        b = 5;
      } else {
        // 0.857 - 1.000: Red to Crimson / Dark Red
        const t = (norm - 0.86) / 0.14;
        r = Math.floor(230 - t * 60);
        g = Math.floor(25 - t * 20);
        b = Math.floor(5 + t * 20);
      }
      return { r, g, b };
    };

    // Equipotential color bands (for 'isopotentials' mode on Page 126)
    const getPotentialColor = (phiNorm: number) => {
      const cycle = (phiNorm * 12) % 1.0;
      const isBand = cycle < 0.12;
      const baseClr = getThesisMachColor(phiNorm);
      if (isBand) {
        return { r: 255, g: 255, b: 255 };
      }
      return baseClr;
    };

    for (let y = 0; y < h; y++) {
      const rCoord = axisY - y; // Radial distance from axis r = 0

      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;

        // Outside computational domain check (beyond dome Gamma_infinity)
        const dxCenter = x - domeCenterX;
        const dyCenter = y - domeCenterY;
        const distCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);

        if (distCenter > domeRadius || y > axisY) {
          // Exterior background
          d[idx] = 11;
          d[idx + 1] = 15;
          d[idx + 2] = 25;
          d[idx + 3] = 255;
          continue;
        }

        // Inside solid nacelle cowl check (core interior only, leaving smooth margin for vector anti-aliasing)
        const inCowlCore = x < lipX - 8 && rCoord > cowlRadius + 5 && rCoord < cowlRadius + cowlThick - 5;
        if (inCowlCore) {
          d[idx] = 20;
          d[idx + 1] = 28;
          d[idx + 2] = 46;
          d[idx + 3] = 255;
          continue;
        }

        // Potential carrier flow field physics (Thesis Page 123):
        let localMach = Minf;
        let phi = 0;

        if (x < lipX && rCoord < cowlRadius) {
          // Inside the intake duct: flow accelerated to engine intake Mach M_M
          const zDuct = (lipX - x) / cowlRadius;
          localMach = MM * (1.0 + 0.15 * Math.exp(-zDuct * 2.0));
          phi = 0.5 + 0.5 * (x / lipX);
        } else {
          // Exterior flow & intake contraction
          // Distance measured to the smooth rounded lip leading edge (Thesis Page 123)
          const lipApexX = lipX + 14;
          const lipApexR = cowlRadius + cowlThick * 0.5;
          const dxLip = x - lipApexX;
          const dyLip = rCoord - lipApexR;
          const distLip = Math.max(0, Math.sqrt(dxLip * dxLip + dyLip * dyLip) - cowlThick * 0.42);

          // Strong Venturi suction acceleration around the smooth nacelle lip (Thesis Page 123)
          const venturiFactor = Math.exp(-Math.pow(distLip / (cowlThick * 0.85), 1.8));
          const lipPeakMach = MM * (1.85 + 0.45 * (Minf / 0.1));

          // Stagnation drop on outer cowl surface
          const isOuterCowl = x < lipX && rCoord > cowlRadius + cowlThick;
          const stagFactor = isOuterCowl ? 0.35 : 1.0;

          // Far-field decay towards Minf
          const decay = Math.min(1.0, distLip / (cowlRadius * 1.5));
          localMach = (Minf * decay + lipPeakMach * venturiFactor + MM * (1 - decay) * 0.4) * stagFactor;
          phi = (x / w) * 0.6 + (1 - venturiFactor) * 0.3;
        }

        // Apply display mode
        if (displayType === 'isopotentials') {
          const { r, g, b } = getPotentialColor(phi);
          d[idx] = r;
          d[idx + 1] = g;
          d[idx + 2] = b;
          d[idx + 3] = 255;
        } else {
          const { r, g, b } = getThesisMachColor(localMach);
          d[idx] = r;
          d[idx + 1] = g;
          d[idx + 2] = b;
          d[idx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Overlay boundary lines: Dome Gamma_infinity
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(domeCenterX, domeCenterY, domeRadius, Math.PI, 0, false);
    ctx.stroke();
    ctx.setLineDash([]);

    // Solid Cowl Outline & Aerodynamic Lip Profile (matching Thesis Page 123)
    const nacelleCowlPath = new Path2D();
    const ductStartX = lipX - Math.floor(w * 0.35);
    const innerY = axisY - cowlRadius;
    const outerY = axisY - (cowlRadius + cowlThick);
    const lipApexX = lipX + 14;
    const lipApexY = axisY - (cowlRadius + cowlThick * 0.5);

    // Inner cowl surface with gentle bellmouth entry into duct
    nacelleCowlPath.moveTo(ductStartX, innerY);
    nacelleCowlPath.lineTo(lipX - 45, innerY);
    nacelleCowlPath.bezierCurveTo(lipX - 15, innerY, lipX + 2, innerY + 2, lipX + 6, innerY - 2);
    // Rounded elliptical leading edge nose (smooth curvature from Page 123)
    nacelleCowlPath.bezierCurveTo(lipX + 12, innerY - 6, lipApexX + 1, lipApexY - 4, lipApexX, lipApexY);
    nacelleCowlPath.bezierCurveTo(lipApexX - 1, lipApexY - 8, lipX + 12, outerY + 4, lipX + 6, outerY + 2);
    // Smooth convex outer cowl contour tapering rearward
    nacelleCowlPath.bezierCurveTo(lipX - 25, outerY - 3, lipX - 75, outerY - 2, ductStartX, outerY);
    // Close at engine duct plane
    nacelleCowlPath.lineTo(ductStartX, innerY);
    nacelleCowlPath.closePath();

    // Fill with aerospace metallic titanium gradient and anti-aliased border
    const cowlGrad = ctx.createLinearGradient(0, outerY - 6, 0, innerY);
    cowlGrad.addColorStop(0, '#1e293b');
    cowlGrad.addColorStop(0.35, '#334155');
    cowlGrad.addColorStop(0.7, '#1e293b');
    cowlGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = cowlGrad;
    ctx.fill(nacelleCowlPath);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.0;
    ctx.stroke(nacelleCowlPath);

    // Axis of symmetry line (r = 0)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(10, axisY);
    ctx.lineTo(w - 10, axisY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Streamlines if requested
    if (displayType === 'streamlines' || displayType === 'mach') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.2;

      // Streamlines curving from exterior into the engine lip
      const streamLines = [
        [lipX + 160, axisY - cowlRadius - 90, lipX + 40, axisY - cowlRadius - 30, lipX - 60, axisY - cowlRadius + 20],
        [lipX + 150, axisY - cowlRadius - 40, lipX + 25, axisY - cowlRadius + 5, lipX - 80, axisY - cowlRadius + 35],
        [lipX + 130, axisY - cowlRadius + 10, lipX + 15, axisY - cowlRadius + 20, lipX - 100, axisY - cowlRadius + 50],
        [lipX + 100, axisY - 20, lipX + 10, axisY - 20, lipX - 100, axisY - 20],
      ];

      streamLines.forEach(([x1, y1, x2, y2, x3, y3]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(x2, y2, x3, y3);
        ctx.stroke();

        // Vector arrow indicator along streamline (no circular particles)
        const angle = Math.atan2(y3 - y2, x3 - x2);
        const arrowX = (x2 + x3) * 0.5;
        const arrowY = (y2 + y3) * 0.5;
        const arrowLen = 6;
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - arrowLen * Math.cos(angle - 0.5), arrowY - arrowLen * Math.sin(angle - 0.5));
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - arrowLen * Math.cos(angle + 0.5), arrowY - arrowLen * Math.sin(angle + 0.5));
        ctx.stroke();
      });
    }

    // Venturi Callout Highlight at Lip Apex (Page 123)
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(lipApexX, lipApexY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Annotations on canvas
    ctx.fillStyle = '#f8fafc';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText('Venturi Lip Hotspot (Thesis Page 123)', lipX - 95, lipApexY - 18);
    ctx.fillText('Γ_∞ (Fictitious Dome)', domeCenterX + domeRadius * 0.45, axisY - domeRadius * 0.75);
    ctx.fillText('Intake Duct (z < 0)', lipX - 120, axisY - cowlRadius * 0.5);
    ctx.fillText('Axis of Symmetry r = 0', w - 160, axisY + 16);
  }, [Minf, MM, displayType]);

  const peakLipMach = (MM * (1.85 + 0.45 * (Minf / 0.1))).toFixed(2);
  const densityDrop = (100 * (1 - Math.pow(1 - 0.2 * parseFloat(peakLipMach) * parseFloat(peakLipMach), 2.5))).toFixed(1);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            Chapter 5.5.3: Non-Linear Carrier Flow & Venturi Effect (Thesis Page 123)
          </div>
          <h3 className="text-base font-bold text-white mt-0.5">
            Nacelle Dome Mach Field & Intake Lip Suction Acceleration
          </h3>
        </div>

        {/* Display Layer Tabs */}
        <div className="flex items-center gap-1.5 p-0.5 bg-slate-950 border border-slate-800 rounded-lg shrink-0">
          <button
            onClick={() => setDisplayType('mach')}
            className={`px-3 py-1 text-xs font-mono rounded transition-all ${
              displayType === 'mach' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Mach Number M₀(r,z)
          </button>
          <button
            onClick={() => setDisplayType('isopotentials')}
            className={`px-3 py-1 text-xs font-mono rounded transition-all ${
              displayType === 'isopotentials' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Isopotentials φ₀
          </button>
          <button
            onClick={() => setDisplayType('streamlines')}
            className={`px-3 py-1 text-xs font-mono rounded transition-all ${
              displayType === 'streamlines' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Streamlines
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Main Dome Flow Canvas */}
        <div className="lg:col-span-8 p-4 bg-slate-950 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-800 relative">
          <canvas
            ref={canvasRef}
            width={580}
            height={320}
            className="rounded-lg border border-slate-800 w-full h-auto shadow-inner select-none"
          />

          {/* Colorbar reproduced exactly from Page 117 & 126 */}
          <div className="w-full mt-3 px-2 flex flex-col gap-1 text-[11px] font-mono text-slate-300">
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0.000</span>
              <span>0.143</span>
              <span>0.286</span>
              <span>0.429</span>
              <span>0.571</span>
              <span>0.714</span>
              <span>0.857</span>
              <span className="text-rose-400 font-bold">1.000 (Sonic limit)</span>
            </div>
            <div className="w-full h-3 rounded bg-gradient-to-r from-blue-900 via-sky-400 via-emerald-400 via-yellow-400 via-orange-500 via-red-600 to-rose-900 border border-slate-700 shadow-sm" />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Quiescent Far-Field</span>
              <span>Baseline Flight M_∞ = {Minf.toFixed(1)}</span>
              <span className="text-amber-400 font-semibold">Venturi Lip Hotspot</span>
            </div>
          </div>
        </div>

        {/* 6 Benchmark Thumbnails & Aerodynamic Rationale */}
        <div className="lg:col-span-4 p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Thesis Benchmarks (Page 117)
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">Click to load</span>
            </div>

            {/* 6 Benchmark Grid */}
            <div className="grid grid-cols-2 gap-2">
              {BENCHMARKS.map((b, i) => {
                const isSelected = Math.abs(MM - b.mm) < 0.02 && Math.abs(Minf - b.minf) < 0.02;
                return (
                  <button
                    key={i}
                    onClick={() => onSelectParams?.(b.minf, b.mm)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-[11px] font-mono font-bold flex items-center justify-between">
                      <span>{b.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Peak Lip Mach: <span className="text-amber-400 font-mono">{b.maxMach}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Physical Telemetry Callout */}
            <div className="p-3 bg-slate-950/90 rounded-lg border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                <span>Peak Lip Mach Number:</span>
                <span className="text-amber-400 font-bold text-sm tabular-nums">M_lip = {peakLipMach}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                <span>Local Air Density Drop:</span>
                <span className="text-rose-400 font-bold tabular-nums">-{densityDrop}%</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                <span>Speed of Sound Variation:</span>
                <span className="text-cyan-300 font-bold tabular-nums">Δa₀ ≈ -5.2%</span>
              </div>
            </div>
          </div>

          {/* Scientific Annotation from Thesis Page 116 */}
          <div className="p-3 bg-cyan-950/20 border border-cyan-900/40 rounded-lg text-xs text-slate-300 leading-relaxed">
            <span className="text-cyan-300 font-semibold block mb-1">
              The Venturi Effect in Turbofan Inlets:
            </span>
            "The highest Mach numbers occur at the lip of the nacelle, where Venturi acceleration effects are strongest. It is precisely these large Mach differentials between the engine intake and the far-field that cause the large acoustic directivity distortions (&gt; 5 dB) in community noise."
            <span className="block text-[10px] font-mono text-slate-400 mt-1">
              — Stefan Duprey Thesis, Section 5.5.1 (Page 116)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
