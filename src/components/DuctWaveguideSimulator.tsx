import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Info, Activity, Radio, Compass, Wind } from 'lucide-react';
import { analyzeDuctMode, besselJ, BESSEL_DERIVATIVE_ZEROS } from '../utils/acousticsMath';
import { MathView } from './MathView';

export const DuctWaveguideSimulator: React.FC = () => {
  const [m, setM] = useState<number>(1);
  const [n, setN] = useState<number>(0);
  const [kM, setKM] = useState<number>(3.5);
  const [MM, setMM] = useState<number>(0.2);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [viewType, setViewType] = useState<'transverse' | 'longitudinal'>('transverse');
  const [time, setTime] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);

  const modeAnalysis = analyzeDuctMode(m, n, kM, MM);

  // Animation loop
  useEffect(() => {
    let lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      const dt = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      if (isPlaying) {
        setTime((prev) => prev + dt * 2.8);
      }

      animFrameId.current = requestAnimationFrame(loop);
    };

    animFrameId.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isPlaying]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (viewType === 'transverse') {
      // 2D Transverse Circular Cross-Section of Nacelle Duct: r in [0, 1], theta in [0, 2pi]
      const centerX = width / 2;
      const centerY = height / 2;
      const maxR = Math.min(centerX, centerY) - 24;

      const imgData = ctx.createImageData(width, height);
      const data = imgData.data;

      // Draw background grid circles
      const zeros = BESSEL_DERIVATIVE_ZEROS[m] || BESSEL_DERIVATIVE_ZEROS[0];
      const zmn = zeros[Math.min(n, zeros.length - 1)];

      const omegaT = time;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const idx = (y * width + x) * 4;

          if (dist > maxR) {
            // Outside duct: dark surface
            data[idx] = 11;
            data[idx + 1] = 15;
            data[idx + 2] = 25;
            data[idx + 3] = 255;
            continue;
          }

          const normR = dist / maxR;
          const theta = Math.atan2(dy, dx);

          // Acoustic mode: J_m(k_rmn * r) * cos(m * theta - omega * t)
          const besselVal = besselJ(m, normR * zmn);
          const angularWave = Math.cos(m * theta - omegaT);
          let potentialVal = besselVal * angularWave;

          if (!modeAnalysis.isPropagative) {
            // Evanescent attenuation indication
            potentialVal *= 0.5;
          }

          // Normalize [-1, 1] to colormap
          const intensity = Math.max(-1, Math.min(1, potentialVal));

          // Colormap: Turbo / Jet scientific gradient
          let r = 0, g = 0, b = 0;
          if (intensity < -0.5) {
            const t = (intensity + 1) * 2;
            r = Math.floor(10 + t * 20);
            g = Math.floor(40 + t * 90);
            b = Math.floor(180 + t * 75);
          } else if (intensity < 0) {
            const t = (intensity + 0.5) * 2;
            r = Math.floor(20 + t * 20);
            g = Math.floor(130 + t * 100);
            b = Math.floor(240 - t * 40);
          } else if (intensity < 0.5) {
            const t = intensity * 2;
            r = Math.floor(40 + t * 210);
            g = Math.floor(220 + t * 25);
            b = Math.floor(180 - t * 160);
          } else {
            const t = (intensity - 0.5) * 2;
            r = Math.floor(250);
            g = Math.floor(240 - t * 190);
            b = Math.floor(20 - t * 15);
          }

          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Nacelle boundary ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxR, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#38bdf8';
      ctx.stroke();

      // Axis crosshairs and labels
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(centerX - maxR, centerY);
      ctx.lineTo(centerX + maxR, centerY);
      ctx.moveTo(centerX, centerY - maxR);
      ctx.lineTo(centerX, centerY + maxR);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText('Rigid Nacelle Wall r = R', centerX - 65, centerY - maxR - 8);
      ctx.fillText(`Center Axis r = 0`, centerX + 8, centerY - 8);
    } else {
      // Longitudinal Duct Section: z horizontal (left = engine core, right = intake opening), r vertical
      const padX = 40;
      const padY = 30;
      const ductW = width - padX * 2;
      const ductH = height - padY * 2;

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      // Draw duct interior with wave propagation
      const zeros = BESSEL_DERIVATIVE_ZEROS[m] || BESSEL_DERIVATIVE_ZEROS[0];
      const zmn = zeros[Math.min(n, zeros.length - 1)];

      const beta = modeAnalysis.isPropagative ? modeAnalysis.betaPlusReal : modeAnalysis.betaPlusImag;
      const omegaT = time;

      const step = 4;
      for (let y = padY; y < padY + ductH; y += step) {
        const normR = Math.abs((y - (padY + ductH / 2)) / (ductH / 2));
        const besselVal = besselJ(m, normR * zmn);

        for (let x = padX; x < padX + ductW; x += step) {
          const normZ = (x - padX) / ductW;
          const zCoord = normZ * 8; // axial length in duct units

          let waveVal = 0;
          if (modeAnalysis.isPropagative) {
            waveVal = besselVal * Math.cos(beta * zCoord - omegaT);
          } else {
            // Exponential attenuation e^{-beta_imag * z}
            const decay = Math.exp(-beta * zCoord);
            waveVal = besselVal * Math.cos(omegaT) * decay;
          }

          const intensity = Math.max(-1, Math.min(1, waveVal));
          let r = 0, g = 0, b = 0;
          if (intensity < 0) {
            const t = intensity + 1;
            r = Math.floor(15 * t);
            g = Math.floor(100 * t);
            b = Math.floor(230 * t);
          } else {
            const t = intensity;
            r = Math.floor(240 * t);
            g = Math.floor(180 * t);
            b = Math.floor(30 * t);
          }

          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(x, y, step, step);
        }
      }

      // Rigid duct walls
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      // Upper wall
      ctx.moveTo(padX, padY);
      ctx.lineTo(padX + ductW, padY);
      // Lower wall
      ctx.moveTo(padX, padY + ductH);
      ctx.lineTo(padX + ductW, padY + ductH);
      ctx.stroke();

      // Flow direction arrow
      ctx.fillStyle = '#06b6d4';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      const arrowY = padY + ductH / 2;
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.moveTo(padX + 20, arrowY);
      ctx.lineTo(padX + ductW - 20, arrowY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText(`Flow v_0 = -M_M a_0 e_z (Mach ${MM.toFixed(2)})`, padX + 20, arrowY - 10);
      ctx.fillText('Engine Interface Γ_M (z = 0)', padX - 10, height - 10);
      ctx.fillText('Intake Face', padX + ductW - 70, height - 10);
    }
  }, [m, n, kM, MM, time, viewType, modeAnalysis]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Component Title & Technical Header */}
      <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 mb-1 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            Chapter 2: Cylindrical Duct Acoustic Waveguide
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Modal Decomposition & Convected Wave Propagation
          </h3>
          <p className="text-sm text-slate-400 mt-0.5">
            Eigenmode spectrum <MathView math="\Xi_{mn}^\pm(r,\theta,z) = J_m(k_{rmn} r) e^{im\theta} e^{i\beta_{mn}^\pm z}" /> with uniform carrier flow.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-lg shrink-0">
          <button
            onClick={() => setViewType('transverse')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewType === 'transverse'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Transverse (r, θ)
          </button>
          <button
            onClick={() => setViewType('longitudinal')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewType === 'longitudinal'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Longitudinal (r, z)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Main Canvas Viewport */}
        <div className="lg:col-span-7 p-6 flex flex-col items-center justify-center bg-slate-950/60 border-b lg:border-b-0 lg:border-r border-slate-800 relative">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={480}
              height={380}
              className="rounded-lg shadow-inner border border-slate-800 max-w-full h-auto"
            />

            {/* Play/pause overlay bar */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-2 bg-slate-900/80 backdrop-blur border border-slate-700/60 rounded-md text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                  title={isPlaying ? 'Pause simulation' : 'Play simulation'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setTime(0)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300 transition-colors"
                  title="Reset phase"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-slate-300 tabular-nums">
                  t = {time.toFixed(1)} s
                </span>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-1.5 font-mono">
                {modeAnalysis.isInverseUpstream ? (
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5" /> Inverse Upstream Mode
                  </span>
                ) : modeAnalysis.isPropagative ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" /> Propagative Mode
                  </span>
                ) : (
                  <span className="text-indigo-400 font-semibold flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5" /> Evanescent Mode
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Colorbar legend */}
          <div className="mt-4 w-full max-w-md flex items-center justify-between text-xs font-mono text-slate-400">
            <span>-1.0 (Min Re φ)</span>
            <div className="flex-1 mx-3 h-2.5 rounded bg-gradient-to-r from-blue-700 via-cyan-400 via-yellow-400 to-red-600 border border-slate-700" />
            <span>+1.0 (Max Re φ)</span>
          </div>
        </div>

        {/* Parameter Controls & Telemetry */}
        <div className="lg:col-span-5 p-6 flex flex-col justify-between space-y-6">
          {/* Mode Selector */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Mode Indices (m, n)
              </span>
              <span className="text-xs font-mono text-cyan-400">
                Mode ({m}, {n}) — {m === 0 && n === 0 ? 'Plane wave' : m === 1 ? 'Dipole / Spinning' : 'High-order spiral'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 mb-1 block">
                  Azimuthal Mode <span className="font-mono text-cyan-300">m = {m}</span>
                </label>
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3, 5].map((val) => (
                    <button
                      key={val}
                      onClick={() => setM(val)}
                      className={`flex-1 py-1.5 text-xs font-mono rounded border transition-all ${
                        m === val
                          ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 mb-1 block">
                  Radial Mode <span className="font-mono text-cyan-300">n = {n}</span>
                </label>
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((val) => (
                    <button
                      key={val}
                      onClick={() => setN(val)}
                      className={`flex-1 py-1.5 text-xs font-mono rounded border transition-all ${
                        n === val
                          ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Reduced Wavenumber k_M R</span>
                  <span className="font-mono text-cyan-300 tabular-nums">{kM.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="15.0"
                  step="0.1"
                  value={kM}
                  onChange={(e) => setKM(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-0.5">
                  <span>0.5 (Low freq)</span>
                  <span>Cutoff = {modeAnalysis.cutoffWavenumber.toFixed(2)}</span>
                  <span>15.0 (High freq)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Engine Duct Flow Mach M_M</span>
                  <span className="font-mono text-cyan-300 tabular-nums">{MM.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.5"
                  step="0.02"
                  value={MM}
                  onChange={(e) => setMM(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-0.5">
                  <span>0.0 (Static bench)</span>
                  <span>0.25 (Cruising inlet)</span>
                  <span>0.50 (High intake)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Precision Metric Readouts */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2.5">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Acoustic Mode Telemetry</span>
              <span className="text-[10px] text-slate-500">Eq 2.6 - 2.8</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-900/60 rounded border border-slate-800/80">
                <span className="text-slate-400 block text-[11px]">Bessel Zero <MathView math="z_{mn}" /></span>
                <span className="font-mono font-bold text-white text-sm tabular-nums">
                  {modeAnalysis.krmn.toFixed(4)}
                </span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded border border-slate-800/80">
                <span className="text-slate-400 block text-[11px]">Cutoff Wavenumber</span>
                <span className="font-mono font-bold text-white text-sm tabular-nums">
                  {modeAnalysis.cutoffWavenumber.toFixed(4)}
                </span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded border border-slate-800/80">
                <span className="text-slate-400 block text-[11px]">Axial Wavenumber β⁺</span>
                <span className="font-mono font-bold text-cyan-300 text-sm tabular-nums">
                  {modeAnalysis.isPropagative
                    ? modeAnalysis.betaPlusReal.toFixed(3)
                    : `${modeAnalysis.betaPlusReal.toFixed(2)} + i${modeAnalysis.betaPlusImag.toFixed(2)}`}
                </span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded border border-slate-800/80">
                <span className="text-slate-400 block text-[11px]">Axial Wavenumber β⁻</span>
                <span className="font-mono font-bold text-cyan-300 text-sm tabular-nums">
                  {modeAnalysis.isPropagative
                    ? modeAnalysis.betaMinusReal.toFixed(3)
                    : `${modeAnalysis.betaMinusReal.toFixed(2)} - i${Math.abs(modeAnalysis.betaMinusImag).toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Group Velocity Readout if propagative */}
            {modeAnalysis.isPropagative && (
              <div className="pt-1 text-xs flex justify-between items-center text-slate-300 border-t border-slate-800/60">
                <span>Group Velocities (Energy speed):</span>
                <span className="font-mono text-cyan-300 tabular-nums">
                  v_g⁺ = {modeAnalysis.groupVelocityPlus.toFixed(2)} c₀ · v_g⁻ = {modeAnalysis.groupVelocityMinus.toFixed(2)} c₀
                </span>
              </div>
            )}
          </div>

          {/* Theoretical Note Callout */}
          <div className="text-xs text-slate-400 bg-cyan-950/20 border border-cyan-900/40 p-3 rounded-lg leading-relaxed">
            <span className="text-cyan-300 font-semibold block mb-1">
              {modeAnalysis.isInverseUpstream
                ? '★ Thesis Discovery: Inverse Upstream Mode Detected!'
                : 'Key Mathematical Property:'}
            </span>
            {modeAnalysis.isInverseUpstream ? (
              <span>
                For <MathView math="\sqrt{1 - M_M^2} k_{rmn} < k_M < k_{rmn}" />, the mode has a positive phase velocity but a negative group velocity! The incoming flow literally carries the acoustic energy backward toward the engine core.
              </span>
            ) : modeAnalysis.isPropagative ? (
              <span>
                Carrier flow compresses forward-traveling waves (<MathView math="\beta^+" /> is increased) and decelerates upstream propagation, verified by the non-linear energy flux theorem <MathView math="I_{mn} = \pm |a_{mn}^\pm|^2" />.
              </span>
            ) : (
              <span>
                Under cutoff (<MathView math="k_M < k_{rmn}\sqrt{1-M_M^2}" />), the mode is strictly evanescent with zero net acoustic energy flux (<MathView math="I_{mn} = 0" />), decaying exponentially in the intake duct.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
