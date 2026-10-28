import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  Award,
  Binary,
  BookMarked,
  Check,
  CheckCircle2,
  ChevronRight,
  Compass,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  FastForward,
  Gauge,
  Globe,
  GraduationCap,
  Info,
  Layers,
  Maximize2,
  Pause,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Sliders,
  Sparkles,
  Volume2,
  Wind,
  Zap,
} from 'lucide-react';

import {
  besselJ,
  BESSEL_DERIVATIVE_ZEROS,
  analyzeDuctMode,
  flowDensity,
  fixedPointIteration,
  calculateDirectivityPattern,
} from './utils/acousticsMath';
import { MathView } from './components/MathView';
import { BibtexModal } from './components/BibtexModal';
import { DeployGuideModal } from './components/DeployGuideModal';
import { NacelleVenturiFlowVisualizer } from './components/NacelleVenturiFlowVisualizer';

// Preset configurations directly referencing thesis scenarios
interface PresetScenario {
  id: string;
  name: string;
  description: string;
  Minf: number;
  MM: number;
  m: number;
  n: number;
  kR: number;
  badge: string;
}

const PRESETS: PresetScenario[] = [
  {
    id: 'takeoff',
    name: 'Takeoff Full Intake',
    description: 'Aircraft takeoff taxi with strong lip acceleration showing > 5 dB far-field directivity distortion.',
    Minf: 0.1,
    MM: 0.3,
    m: 1,
    n: 0,
    kR: 2.0,
    badge: 'Certification Critical',
  },
  {
    id: 'bench',
    name: 'Static Test Bench',
    description: 'Ground engine test bench at zero flight speed (Minf = 0), plane wave mode.',
    Minf: 0.0,
    MM: 0.2,
    m: 0,
    n: 0,
    kR: 2.0,
    badge: 'Bench Reference',
  },
  {
    id: 'inverse',
    name: 'Inverse Upstream Mode',
    description: 'Acoustic wave trapped and carried backward by flow (positive phase, negative group velocity).',
    Minf: 0.1,
    MM: 0.35,
    m: 2,
    n: 0,
    kR: 2.9,
    badge: 'Wave Discovery',
  },
  {
    id: 'highfreq',
    name: 'High Frequency Beaming',
    description: 'Pencil-beam radiation at kR = 60, behaving like a directional water nozzle (Thesis p. 125).',
    Minf: 0.1,
    MM: 0.1,
    m: 1,
    n: 1,
    kR: 60.0,
    badge: 'kR = 60 Beaming',
  },
];

export default function App() {
  // Master Dashboard State (All components synchronize to these variables)
  const [Minf, setMinf] = useState<number>(0.1);
  const [MM, setMM] = useState<number>(0.2);
  const [m, setM] = useState<number>(1);
  const [n, setN] = useState<number>(0);
  const [kR, setKR] = useState<number>(2.0);
  const [massFlux, setMassFlux] = useState<number>(0.5);

  // Simulation animation state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);
  const [simSpeed, setSimSpeed] = useState<number>(1.0);

  // UI state
  const [isBibtexOpen, setIsBibtexOpen] = useState<boolean>(false);
  const [isDeployGuideOpen, setIsDeployGuideOpen] = useState<boolean>(false);
  const [activeZoneDetail, setActiveZoneDetail] = useState<'zone1' | 'zone2' | 'zone3' | 'gammaM' | 'gammaInf'>('zone2');
  const [polarMode, setPolarMode] = useState<'linear' | 'decibel'>('linear');
  const [polarTheme, setPolarTheme] = useState<'thesis' | 'dark'>('thesis');
  const [hoverPolarAngle, setHoverPolarAngle] = useState<number>(40);

  // Non-linear carrier flow & wavefield visualization mode
  const [wavefieldDisplayMode, setWavefieldDisplayMode] = useState<'split' | 'flow' | 'acoustic' | 'coupled'>('split');
  const [hoverCanvasPos, setHoverCanvasPos] = useState<{ x: number; y: number } | null>(null);

  // References
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Live Calculations
  const modeAnalysis = useMemo(() => {
    return analyzeDuctMode(m, n, kR, MM);
  }, [m, n, kR, MM]);

  const fixedPointResult = useMemo(() => {
    return fixedPointIteration(massFlux, Minf, 25, 1.4);
  }, [massFlux, Minf]);

  const cStar = useMemo(() => {
    return Math.sqrt((2 / 2.4) * (1 + 0.2 * Minf * Minf));
  }, [Minf]);

  // Directivity data for polar diagram matching Thesis Page 125 Figure 5.5.5
  const polarDirectivity = useMemo(() => {
    const angles = Array.from({ length: 361 }, (_, i) => i);

    // 4 standard Mach curves from Figure 5.5.5 on Page 125 (exact colors from attached image)
    const conditions = [
      { id: 'm0', label: 'M_M = 0.0', mm: 0.0, color: '#0284c7', active: true },
      { id: 'm1', label: 'M_M = 0.1', mm: 0.1, color: '#dc2626', active: true },
      { id: 'm2', label: 'M_M = 0.2', mm: 0.2, color: '#16a34a', active: true },
      { id: 'm3', label: 'M_M = 0.3', mm: 0.3, color: '#eab308', active: true },
    ];

    // Scale matching Page 125: m=0 has max 10, m=1 has max 4, high-freq has max 20
    const scaleMax = kR >= 30 ? 20 : (m === 0 && n === 0 ? 10 : 4);

    const curves = conditions.map((c) => {
      const pts = angles.map((theta) => {
        const { directivityLinear, directivityDb } = calculateDirectivityPattern(
          theta,
          m,
          n,
          kR,
          c.mm,
          Minf
        );
        return { theta, linear: directivityLinear, db: directivityDb };
      });
      return { ...c, pts };
    });

    // Current interactive slider curve if distinct from standard 4
    const currentPts = angles.map((theta) => {
      const { directivityLinear, directivityDb } = calculateDirectivityPattern(
        theta,
        m,
        n,
        kR,
        MM,
        Minf
      );
      return { theta, linear: directivityLinear, db: directivityDb };
    });

    const p0 = calculateDirectivityPattern(hoverPolarAngle, m, n, kR, 0.0, Minf);
    const pCur = calculateDirectivityPattern(hoverPolarAngle, m, n, kR, MM, Minf);
    const p3 = calculateDirectivityPattern(hoverPolarAngle, m, n, kR, 0.3, Minf);
    const deltaDb = Math.abs(pCur.directivityDb - p0.directivityDb);
    const maxDeltaDbAtAngle = Math.abs(p3.directivityDb - p0.directivityDb);

    return {
      curves,
      currentPts,
      scaleMax,
      deltaDb,
      maxDeltaDbAtAngle,
      dbCur: pCur.directivityDb,
      db0: p0.directivityDb,
      linCur: pCur.directivityLinear,
      lin0: p0.directivityLinear,
    };
  }, [m, n, kR, MM, Minf, hoverPolarAngle]);

  // Master 60fps simulation loop
  useEffect(() => {
    let lastTime = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      if (isPlaying) {
        setSimTime((prev) => prev + dt * 3.2 * simSpeed);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, simSpeed]);

  // Real-time Canvas Rendering: Acoustic Wavefield & Non-Linear Carrier Flow
  useEffect(() => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;

    const zeros = BESSEL_DERIVATIVE_ZEROS[m] || BESSEL_DERIVATIVE_ZEROS[0];
    const zmn = zeros[Math.min(n, zeros.length - 1)];

    const ductLipX = Math.floor(w * 0.44);
    const ductR = Math.floor(h * 0.32);
    const centerY = Math.floor(h * 0.5);

    const beta = modeAnalysis.isPropagative ? modeAnalysis.betaPlusReal : modeAnalysis.betaPlusImag;
    const omegaT = simTime;

    // Colormap helpers: Non-linear Carrier Mach field (Thesis Page 117 & 126)
    const getMachColor = (machVal: number) => {
      // Scale: 0.00 (deep blue) -> 0.15 (cyan) -> 0.30 (green) -> 0.45 (yellow) -> 0.65 (orange) -> 0.85+ (crimson)
      const norm = Math.max(0, Math.min(1.0, machVal / 0.85));
      let r = 0, g = 0, b = 0;
      if (norm < 0.18) {
        const t = norm / 0.18;
        r = Math.floor(8 + t * 15);
        g = Math.floor(25 + t * 95);
        b = Math.floor(130 + t * 115);
      } else if (norm < 0.38) {
        const t = (norm - 0.18) / 0.20;
        r = Math.floor(23 + t * 15);
        g = Math.floor(120 + t * 105);
        b = Math.floor(245 - t * 135);
      } else if (norm < 0.58) {
        const t = (norm - 0.38) / 0.20;
        r = Math.floor(38 + t * 195);
        g = Math.floor(225 + t * 25);
        b = Math.floor(110 - t * 90);
      } else if (norm < 0.80) {
        const t = (norm - 0.58) / 0.22;
        r = Math.floor(233 + t * 22);
        g = Math.floor(250 - t * 135);
        b = Math.floor(20 - t * 15);
      } else {
        const t = (norm - 0.80) / 0.20;
        r = Math.floor(255 - t * 35);
        g = Math.floor(115 - t * 95);
        b = Math.floor(5 + t * 15);
      }
      return { r, g, b };
    };

    // Colormap helpers: Acoustic Mode Wavefield phi_a
    const getWaveColor = (waveVal: number) => {
      const val = Math.max(-1, Math.min(1, waveVal));
      let r = 0, g = 0, b = 0;
      if (val < -0.5) {
        const t = (val + 1) * 2;
        r = Math.floor(10 + t * 20);
        g = Math.floor(35 + t * 90);
        b = Math.floor(160 + t * 80);
      } else if (val < 0) {
        const t = (val + 0.5) * 2;
        r = Math.floor(30 + t * 10);
        g = Math.floor(125 + t * 95);
        b = Math.floor(240 - t * 30);
      } else if (val < 0.5) {
        const t = val * 2;
        r = Math.floor(40 + t * 200);
        g = Math.floor(220 + t * 20);
        b = Math.floor(210 - t * 180);
      } else {
        const t = (val - 0.5) * 2;
        r = Math.floor(240 + t * 15);
        g = Math.floor(240 - t * 180);
        b = Math.floor(30 - t * 20);
      }
      return { r, g, b };
    };

    // Precompute radial Bessel values per row (320 rows) for 60fps performance and exact aperture continuity
    const besselRow = new Float32Array(h);
    for (let y = 0; y < h; y++) {
      const normR = Math.min(1.0, Math.abs(y - centerY) / ductR);
      besselRow[y] = besselJ(m, normR * zmn);
    }

    // Precompute directivity lookup table across all 360 degrees for current mode & Mach condition
    const directivityLookup = new Float32Array(361);
    let maxDir = 1.0;
    for (let deg = 0; deg <= 360; deg++) {
      const val = calculateDirectivityPattern(deg, m, n, kR, MM, Minf).directivityLinear;
      directivityLookup[deg] = val;
      if (val > maxDir) maxDir = val;
    }

    // Scale wavenumber for visual display (ensuring 2-4 wavelengths inside duct)
    const betaDisp = modeAnalysis.isPropagative ? Math.max(0.04, Math.min(0.18, beta * 0.05)) : 0.05;
    const k0Disp = Math.max(0.05, Math.min(0.20, (kR / ductR) * 1.8));

    for (let y = 0; y < h; y++) {
      const dy = y - centerY;
      const absDy = Math.abs(dy);
      const besselVal = besselRow[y];

      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;

        // Solid aerodynamic nacelle cowl structure: from inner wall (ductR) to outer wall (ductR + 25)
        // Closing the previous 5px margin gap completely eliminates spurious wave slivers inside metal
        const isInsideCowlSolid = x <= ductLipX + 4 && absDy >= ductR && absDy <= ductR + 25;
        if (isInsideCowlSolid) {
          d[idx] = 18;
          d[idx + 1] = 26;
          d[idx + 2] = 44;
          d[idx + 3] = 255;
          continue;
        }

        // 1. Calculate continuous, seamless Non-linear Carrier Flow field (Thesis Chapter 4 & Page 123)
        // Unified potential flow solution between engine intake (M_M) and free stream (M_inf):
        const zRelFlow = x - ductLipX;
        // Smooth semi-infinite duct suction transition operator S(x, r):
        // Asymptotes to 1 deep in duct (zRelFlow << 0), 0.5 at lip (zRelFlow = 0), and 0 far ahead (zRelFlow >> 0)
        const ductDenom = Math.sqrt(zRelFlow * zRelFlow + absDy * absDy * 0.75 + ductR * ductR);
        const ductSuctionS = 0.5 * (1.0 - zRelFlow / ductDenom);

        // Continuous axial and radial velocities everywhere in space:
        const carrierVz = -Minf - (MM - Minf) * ductSuctionS;
        const carrierVr = -(MM - Minf) * (dy / (2 * ductDenom)) * Math.exp(-Math.pow(zRelFlow / (ductR * 1.3), 2));
        const baseSpeed = Math.sqrt(carrierVz * carrierVz + carrierVr * carrierVr);

        // Smooth Venturi Lip Acceleration (Thesis Section 5.5.3, Page 123):
        // Flow turning around the curved nacelle lip creates an intense local potential vortex core
        const lipApexX = ductLipX + 10;
        const lipApexR = ductR + 12;
        const dxLip = x - lipApexX;
        const drLip = absDy - lipApexR;
        // Smooth Euclidean distance to the circular lip ring
        const distLip = Math.sqrt(dxLip * dxLip * 0.85 + drLip * drLip * 1.25);

        // High local Mach acceleration peak (reaches M ~ 0.80 - 0.95 at lip nose)
        const venturiStrength = MM * 2.35 * (1 + Minf * 1.80);
        const venturiBoost = venturiStrength / (1 + Math.pow(distLip / 26, 2.0));

        // Combined C-infinity continuous Mach number field everywhere (strictly smooth, zero jumps)
        const carrierMach = Math.min(1.20, baseSpeed + venturiBoost);

        // 2. Aeroacoustic Wavefield: Exact physical domain formulation
        // Zone 1: Guided Bessel duct mode (m, n) strictly confined INSIDE the intake duct (absDy <= ductR, x <= ductLipX).
        // Zone 2: Exterior behind intake lip (absDy > ductR, x <= ductLipX): No guided mode! Radiated diffraction only.
        // Zone 3: Forward radiating field (x > ductLipX): Continuous aperture matching with thesis directivity lobes.
        let wave = 0;

        if (x <= ductLipX && absDy <= ductR) {
          // ZONE 1: GUIDED DUCT MODE (strictly inside duct tube)
          // Waveguide eigenmode J_m(z_mn * r/R) * cos(beta * (x - x_lip) - omega*t)
          const normR = absDy / ductR;
          const ductAmp = besselJ(m, normR * zmn);
          const ductPhase = betaDisp * (x - ductLipX) - omegaT;
          wave = ductAmp * Math.cos(ductPhase);

        } else if (x <= ductLipX && absDy > ductR) {
          // ZONE 2: EXTERIOR BEHIND INTAKE LIP (left and above the duct)
          // Visible weak backward-propagating diffracted acoustic wave traveling to the left:
          const dxAft = ductLipX - x; // distance rearward of lip plane (dxAft >= 0)
          const normR = absDy / ductR;

          // Gentle radial envelope across the upper strip (visible weak wave, ~0.26 amplitude)
          const radialEnv = Math.exp(-Math.pow((normR - 1.0) / 0.65, 1.8));

          // Gentle rearward decay along the nacelle
          const shadowDecay = Math.exp(-dxAft / (ductR * 1.6));

          // Base amplitude: weak (~25% of duct mode) for clean, realistic visual contrast
          const weakAmp = 0.28 * radialEnv * shadowDecay;

          // Convective Doppler wavenumber for backward propagation along the cowl
          const kBackward = k0Disp / (1.0 + Minf);

          // Phase: constant phase dxAft = (omega*t + const)/k => travels leftward (backward)!
          // Seamlessly matches -omegaT at dxAft = 0 (x = ductLipX)
          const phase = kBackward * dxAft - omegaT;

          wave = weakAmp * Math.cos(phase);

        } else {
          // ZONE 3: FORWARD RADIATING WAVEFIELD (x > ductLipX, exiting fan mouth into exterior)
          const dx = x - ductLipX;
          const r = Math.sqrt(dx * dx + dy * dy);
          const thetaRad = Math.atan2(absDy, Math.max(0.001, dx));
          const thetaDeg = Math.min(180, Math.max(0, Math.round((thetaRad * 180) / Math.PI)));

          // Directivity from Thesis Chapter 5 / Page 125 Figure 5.5.5
          const dirAmp = directivityLookup[thetaDeg] / maxDir;

          // Smooth Fresnel transition parameter from aperture plane to far-field
          // xi = 0 at dx = 0 (exact aperture profile matching), xi -> 1 far ahead
          const xi = 1 - Math.exp(-dx / (ductR * 1.25));

          // Effective acoustic path: planar at mouth (dx = 0 => sPath = 0 for all y!), expanding to circular
          // Evaluated uniformly for ALL y: mathematically guarantees ZERO horizontal line!
          const sPath = (1 - xi) * dx + xi * r;

          // Smooth convective wavenumber transition
          const dopplerK = k0Disp / Math.max(0.35, 1 - Minf * Math.cos(thetaRad));
          const localK = (1 - xi) * betaDisp + xi * dopplerK;
          const phase = localK * sPath - omegaT;

          // Aperture near-field profile: C^1 smooth across normR = 1.0 (since J'_m(z_mn) = 0 at duct wall)
          const normR = absDy / ductR;
          const nearAmp = normR <= 1.0
            ? besselJ(m, normR * zmn)
            : besselJ(m, zmn) * Math.exp(-Math.pow((normR - 1.0) / 0.15, 2));

          const spreading = 1 / Math.sqrt(1 + xi * (r / (ductR * 1.5)));
          const blendedAmp = (1 - xi) * nearAmp + xi * dirAmp;

          wave = blendedAmp * spreading * Math.cos(phase);
        }

        // 3. Render pixel according to selected wavefieldDisplayMode
        if (wavefieldDisplayMode === 'split') {
          // SPLIT MODE (Axisymmetric research view):
          // Top half (dy <= 0): Acoustic field (guided duct mode inside tube, radiation in front and above)
          // Bottom half (dy > 0): Non-Linear Carrier Flow with Venturi Effect (Thesis Page 123)
          if (dy <= 0) {
            const { r, g, b } = getWaveColor(wave);
            d[idx] = r;
            d[idx + 1] = g;
            d[idx + 2] = b;
            d[idx + 3] = 255;
          } else {
            const { r, g, b } = getMachColor(carrierMach);
            d[idx] = r;
            d[idx + 1] = g;
            d[idx + 2] = b;
            d[idx + 3] = 255;
          }
        } else if (wavefieldDisplayMode === 'flow') {
          // Pure Non-linear Carrier Mach field everywhere (Thesis Page 123)
          const { r, g, b } = getMachColor(carrierMach);
          d[idx] = r;
          d[idx + 1] = g;
          d[idx + 2] = b;
          d[idx + 3] = 255;
        } else if (wavefieldDisplayMode === 'coupled') {
          // Wave propagating in duct AND radiating out of the fan, modulated over carrier flow
          const waveClr = getWaveColor(wave);
          const flowClr = getMachColor(carrierMach);
          d[idx] = Math.floor(waveClr.r * 0.72 + flowClr.r * 0.28);
          d[idx + 1] = Math.floor(waveClr.g * 0.72 + flowClr.g * 0.28);
          d[idx + 2] = Math.floor(waveClr.b * 0.72 + flowClr.b * 0.28);
          d[idx + 3] = 255;
        } else {
          // 'acoustic': Full symmetric view of acoustic wavefield everywhere
          const { r, g, b } = getWaveColor(wave);
          d[idx] = r;
          d[idx + 1] = g;
          d[idx + 2] = b;
          d[idx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // 4. Equipotential / Streamline Contour Lines (Smooth curves, Page 123)
    if (wavefieldDisplayMode === 'flow' || wavefieldDisplayMode === 'split') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      [45, 95, 150, 215, 290].forEach((rad) => {
        ctx.beginPath();
        if (wavefieldDisplayMode === 'split') {
          // In split mode, draw only on the bottom half where non-linear flow is displayed
          ctx.arc(ductLipX + 8, centerY, rad, 0, Math.PI * 0.48);
        } else {
          ctx.arc(ductLipX + 8, centerY, rad, -Math.PI * 0.48, Math.PI * 0.48);
        }
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // 4b. Emphasized Venturi Lip Isobar Contours & Streamlines around Lower Lip Nose (Thesis Page 123)
      const lowerLipApexX = ductLipX + 10;
      const lowerLipApexY = centerY + ductR + 12;

      // Concentric elliptical Iso-Mach contours wrapping tightly around the lower lip nose
      const lipIsobars = [
        { rx: 14, ry: 9, stroke: 'rgba(255, 255, 255, 0.75)', width: 1.5, dash: [] },
        { rx: 24, ry: 16, stroke: 'rgba(251, 191, 36, 0.65)', width: 1.2, dash: [4, 3] },
        { rx: 38, ry: 25, stroke: 'rgba(245, 158, 11, 0.50)', width: 1.0, dash: [4, 4] },
        { rx: 56, ry: 36, stroke: 'rgba(56, 189, 248, 0.35)', width: 1.0, dash: [3, 4] },
      ];

      lipIsobars.forEach(({ rx, ry, stroke, width, dash }) => {
        ctx.beginPath();
        // Conformal arc wrapping from outer cowl around nose apex into the intake throat
        ctx.ellipse(lowerLipApexX, lowerLipApexY, rx, ry, 0.12, -Math.PI * 0.45, Math.PI * 0.85);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = width;
        ctx.setLineDash(dash);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Aerodynamic turning streamlines curling into the lower intake throat
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(lowerLipApexX + 65, lowerLipApexY + 40);
      ctx.bezierCurveTo(lowerLipApexX + 35, lowerLipApexY + 28, lowerLipApexX + 15, lowerLipApexY + 12, lowerLipApexX - 18, lowerLipApexY - 6);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(lowerLipApexX + 85, lowerLipApexY + 18);
      ctx.bezierCurveTo(lowerLipApexX + 40, lowerLipApexY + 12, lowerLipApexX + 14, lowerLipApexY + 4, lowerLipApexX - 28, lowerLipApexY - 12);
      ctx.stroke();
    }

    // 5. Draw Ultra-Smooth Aerodynamic Nacelle Cowl (Exact profile from Thesis Page 123)
    const upperCowlPath = new Path2D();
    const ductStartX = 10;
    const lipApexX = ductLipX + 12;
    const lipThick = 24;

    // Upper Cowl: smooth aerodynamic NACA-1 style profile
    upperCowlPath.moveTo(ductStartX, centerY - ductR);
    upperCowlPath.lineTo(ductLipX - 35, centerY - ductR);
    // Smooth bellmouth flare into lip leading edge
    upperCowlPath.bezierCurveTo(ductLipX - 10, centerY - ductR, ductLipX + 2, centerY - ductR + 1, ductLipX + 6, centerY - ductR - 3);
    // Rounded elliptical leading edge nose (smooth curvature matching Page 123)
    upperCowlPath.bezierCurveTo(ductLipX + 13, centerY - ductR - 8, lipApexX, centerY - ductR - 12, ductLipX + 13, centerY - ductR - 16);
    upperCowlPath.bezierCurveTo(ductLipX + 6, centerY - ductR - 21, ductLipX - 10, centerY - ductR - lipThick, ductLipX - 35, centerY - ductR - lipThick);
    // Smooth outer cowl contour tapering rearward
    upperCowlPath.bezierCurveTo(ductLipX - 110, centerY - ductR - (lipThick + 2), ductLipX - 200, centerY - ductR - (lipThick - 2), ductStartX, centerY - ductR - (lipThick - 4));
    upperCowlPath.lineTo(ductStartX, centerY - ductR);
    upperCowlPath.closePath();

    // Lower Cowl: symmetric across axis of symmetry
    const lowerCowlPath = new Path2D();
    lowerCowlPath.moveTo(ductStartX, centerY + ductR);
    lowerCowlPath.lineTo(ductLipX - 35, centerY + ductR);
    // Smooth bellmouth flare into lip leading edge
    lowerCowlPath.bezierCurveTo(ductLipX - 10, centerY + ductR, ductLipX + 2, centerY + ductR - 1, ductLipX + 6, centerY + ductR + 3);
    // Rounded elliptical leading edge nose (smooth curvature matching Page 123)
    lowerCowlPath.bezierCurveTo(ductLipX + 13, centerY + ductR + 8, lipApexX, centerY + ductR + 12, ductLipX + 13, centerY + ductR + 16);
    lowerCowlPath.bezierCurveTo(ductLipX + 6, centerY + ductR + 21, ductLipX - 10, centerY + ductR + lipThick, ductLipX - 35, centerY + ductR + lipThick);
    // Smooth outer cowl contour tapering rearward
    lowerCowlPath.bezierCurveTo(ductLipX - 110, centerY + ductR + (lipThick + 2), ductLipX - 200, centerY + ductR + (lipThick - 2), ductStartX, centerY + ductR + (lipThick - 4));
    lowerCowlPath.lineTo(ductStartX, centerY + ductR);
    lowerCowlPath.closePath();

    // Render shaded solid cowls with vector sub-pixel anti-aliasing
    const upperGrad = ctx.createLinearGradient(0, centerY - ductR - lipThick - 4, 0, centerY - ductR);
    upperGrad.addColorStop(0, '#1e293b');
    upperGrad.addColorStop(0.35, '#334155');
    upperGrad.addColorStop(0.7, '#1e293b');
    upperGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = upperGrad;
    ctx.fill(upperCowlPath);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.0;
    ctx.stroke(upperCowlPath);

    const lowerGrad = ctx.createLinearGradient(0, centerY + ductR, 0, centerY + ductR + lipThick + 4);
    lowerGrad.addColorStop(0, '#0f172a');
    lowerGrad.addColorStop(0.3, '#1e293b');
    lowerGrad.addColorStop(0.65, '#334155');
    lowerGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = lowerGrad;
    ctx.fill(lowerCowlPath);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.0;
    ctx.stroke(lowerCowlPath);

    // Duct Lip Intake Aperture Plane Boundary Γ_exit (between upper and lower cowl lips)
    ctx.beginPath();
    ctx.setLineDash([4, 3]);
    ctx.moveTo(ductLipX, centerY - ductR);
    ctx.lineTo(ductLipX, centerY + ductR);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // Centerline (axis of revolution r = 0)
    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.moveTo(10, centerY);
    ctx.lineTo(w - 10, centerY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // 6. Labels and Annotations directly on the canvas
    if (wavefieldDisplayMode === 'split') {
      // Top Half Annotations (Acoustic Mode Wavefield propagating in duct and radiating out of fan)
      ctx.fillStyle = '#67e8f9';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.fillText(`↑ DUCT MODE (${m}, ${n}) → RADIATING OUT OF FAN`, 16, centerY - ductR + 20);

      // Exterior Radiation Annotation
      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText('Radiated Wavefield |A(θ)| (Thesis Page 125)', ductLipX + 25, 22);

      // Aperture Plane Label
      ctx.fillStyle = '#67e8f9';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText('Fan Exit Γ_exit', ductLipX - 44, centerY - ductR - 8);

      // Bottom Half Annotations (Non-Linear Flow with Venturi Effect)
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.fillText(`↓ NON-LINEAR CARRIER FLOW (M_M = ${MM.toFixed(2)})`, 16, centerY + 24);

      // Emphasized Venturi Lip Hotspot Callout & Readout at the lower nacelle lip
      const peakLipMach = (MM * 2.45 * (1 + Minf * 1.85) + MM).toFixed(2);
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.fillText(`⚡ VENTURI LIP ACCELERATION (M ≈ ${peakLipMach})`, ductLipX - 65, centerY + ductR + 42);

      ctx.fillStyle = '#fbbf24';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText('Isobar contours & suction peak (p. 123)', ductLipX - 65, centerY + ductR + 54);

      // Glowing target marker on lower lip apex (ductLipX + 10, centerY + ductR + 12)
      const markerX = ductLipX + 10;
      const markerY = centerY + ductR + 12;
      ctx.beginPath();
      ctx.arc(markerX, markerY, 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(markerX, markerY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();

      // Axis of Symmetry indicator
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText('Axis of Symmetry r = 0', w - 175, centerY - 6);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText('Engine Interface Γ_M', 15, centerY - ductR - 6);
      ctx.fillText('Venturi Lip Acceleration (Page 123)', ductLipX - 60, centerY - ductR - 26);
      ctx.fillText(`Exterior Radiation & Flow (M_∞ = ${Minf.toFixed(2)})`, ductLipX + 50, 24);
      ctx.fillText('Axis of Symmetry r = 0', w - 175, centerY - 6);
    }

    // Hover Probe Crosshair & Readout on Canvas
    if (hoverCanvasPos) {
      ctx.beginPath();
      ctx.arc(hoverCanvasPos.x, hoverCanvasPos.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Probe HUD box
      const isTop = hoverCanvasPos.y <= centerY;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      const boxW = 176;
      const boxH = 46;
      const boxX = Math.min(w - boxW - 10, hoverCanvasPos.x + 12);
      const boxY = Math.min(h - boxH - 10, hoverCanvasPos.y + 12);
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '10px JetBrains Mono, monospace';
      const inDuct = hoverCanvasPos.x <= ductLipX && Math.abs(hoverCanvasPos.y - centerY) <= ductR;
      const isRadiatedField = hoverCanvasPos.x > ductLipX && (wavefieldDisplayMode === 'split' ? isTop : wavefieldDisplayMode === 'acoustic');

      const isAcousticActive = wavefieldDisplayMode === 'acoustic' || (wavefieldDisplayMode === 'split' && isTop);

      if (isAcousticActive && inDuct) {
        ctx.fillText(`Guided Duct Mode φ_a (${m}, ${n})`, boxX + 8, boxY + 16);
        ctx.fillStyle = '#38bdf8';
        const zR = ((hoverCanvasPos.x - ductLipX) / ductR).toFixed(2);
        const rR = (Math.abs(hoverCanvasPos.y - centerY) / ductR).toFixed(2);
        ctx.fillText(`z/R = ${zR}  r/R = ${rR}`, boxX + 8, boxY + 34);
      } else if (isAcousticActive && hoverCanvasPos.x > ductLipX) {
        ctx.fillText(`Radiated Wave |A(θ)| (${m}, ${n})`, boxX + 8, boxY + 16);
        ctx.fillStyle = '#38bdf8';
        const angleDeg = Math.round(Math.atan2(Math.abs(hoverCanvasPos.y - centerY), Math.max(0.1, hoverCanvasPos.x - ductLipX)) * 180 / Math.PI);
        const distR = (Math.sqrt(Math.pow(hoverCanvasPos.x - ductLipX, 2) + Math.pow(hoverCanvasPos.y - centerY, 2)) / ductR).toFixed(1);
        ctx.fillText(`θ = ${angleDeg}°  R = ${distR} R`, boxX + 8, boxY + 34);
      } else if (isAcousticActive && hoverCanvasPos.x <= ductLipX && Math.abs(hoverCanvasPos.y - centerY) > ductR) {
        ctx.fillText(`Exterior Shadow Field (θ > 90°)`, boxX + 8, boxY + 16);
        ctx.fillStyle = '#38bdf8';
        const angleDeg = Math.round(Math.atan2(Math.abs(hoverCanvasPos.y - centerY), hoverCanvasPos.x - ductLipX) * 180 / Math.PI);
        ctx.fillText(`θ = ${angleDeg}° (Acoustic Shadow)`, boxX + 8, boxY + 34);
      } else {
        ctx.fillText('Carrier Flow M_0(r,z)', boxX + 8, boxY + 16);
        ctx.fillStyle = '#f59e0b';
        // Compute accurate local Mach matching the emphasized Venturi field
        const lipDist = Math.sqrt(Math.pow(hoverCanvasPos.x - (ductLipX + 10), 2) + Math.pow(Math.abs(hoverCanvasPos.y - centerY) - (ductR + 12), 2));
        let localMachVal = inDuct ? MM : (hoverCanvasPos.x < ductLipX ? Minf : (hoverCanvasPos.x < ductLipX + 30 ? MM * 1.5 : Minf * 1.15));
        if (lipDist < 45) {
          const vBoost = (MM * 2.45 * (1 + Minf * 1.85)) / (1 + Math.pow(lipDist / 26, 2.1));
          localMachVal = Math.min(1.2, Math.max(localMachVal, MM + vBoost));
        }
        ctx.fillText(`Local Mach ≈ ${localMachVal.toFixed(2)} (Page 123)`, boxX + 8, boxY + 34);
      }
    }
  }, [m, n, kR, MM, Minf, simTime, modeAnalysis, wavefieldDisplayMode, hoverCanvasPos]);

  // Load a preset scenario
  const applyPreset = (preset: PresetScenario) => {
    setMinf(preset.Minf);
    setMM(preset.MM);
    setM(preset.m);
    setN(preset.n);
    setKR(preset.kR);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0" />
          <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap shrink-0">
            PA2R · Aeroacoustics Research Console
          </span>
          <span className="hidden sm:inline-block text-slate-600">/</span>
          <span className="hidden sm:inline-block text-xs font-mono text-slate-400">
            Dr. Stefan Duprey (Univ. Nancy 1 & EADS-CCR)
          </span>
        </div>

        {/* Zone 2: Navigation / Section Jump Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-400">
          <a href="#simulator" className="hover:text-white transition-colors whitespace-nowrap">
            Wavefield & Modes
          </a>
          <a href="#directivity" className="hover:text-white transition-colors whitespace-nowrap">
            Far-Field Radar
          </a>
          <a href="#potential-flow" className="hover:text-white transition-colors whitespace-nowrap">
            Nečas Fixed-Point
          </a>
          <a href="#matrix-system" className="hover:text-white transition-colors whitespace-nowrap">
            FEM-BEM Matrix
          </a>
          <a href="#formulae" className="hover:text-white transition-colors whitespace-nowrap">
            Math Compendium
          </a>
        </nav>

        {/* Zone 3: Primary Action CTA */}
        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href="./turbofan-aeroacoustics.zip"
            download="turbofan-aeroacoustics.zip"
            className="px-3 py-1.5 text-xs font-mono font-medium text-cyan-300 bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 hover:border-cyan-400 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            title="Download full project code and built assets (.zip)"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Download Code (.zip)</span>
            <span className="sm:hidden">ZIP</span>
          </a>
          <button
            onClick={() => setIsDeployGuideOpen(true)}
            className="px-3 py-1.5 text-xs font-mono font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            title="Step-by-step guide to get a permanent URL for your résumé"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Permanent CV Link</span>
            <span className="md:hidden">CV Link</span>
          </button>
          <button
            onClick={() => setIsBibtexOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0"
          >
            BibTeX Citation
          </button>
        </div>
      </header>

      {/* Main Consolidated Dashboard Container */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Master Control & Telemetry Ribbon */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-xl flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
          {/* Preset Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 xl:pb-0">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Scenarios:
            </span>
            {PRESETS.map((p) => {
              const isActive =
                Minf === p.Minf && MM === p.MM && m === p.m && n === p.n && Math.abs(kR - p.kR) < 0.1;
              return (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p)}
                  className={`px-3 py-1.5 text-xs font-mono rounded-lg border whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span>{p.name}</span>
                  <span className="text-[10px] text-cyan-400 font-sans opacity-70">[{p.badge}]</span>
                </button>
              );
            })}
          </div>

          {/* Quick Scrubber Controls */}
          <div className="flex flex-wrap items-center gap-4 bg-slate-950/80 px-4 py-2 rounded-lg border border-slate-800">
            {/* Play/Pause */}
            <div className="flex items-center gap-2 border-r border-slate-800 pr-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                title={isPlaying ? 'Pause simulation' : 'Resume simulation'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setSimTime(0)}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 transition-colors"
                title="Reset simulation time"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono text-slate-400 tabular-nums">
                t = {simTime.toFixed(1)}s
              </span>
            </div>

            {/* Mach Controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">Flight M_∞:</span>
              <input
                type="range"
                min="0.0"
                max="0.3"
                step="0.05"
                value={Minf}
                onChange={(e) => setMinf(parseFloat(e.target.value))}
                className="w-16 accent-cyan-400 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-cyan-300">{Minf.toFixed(2)}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">Engine M_M:</span>
              <input
                type="range"
                min="0.0"
                max="0.4"
                step="0.05"
                value={MM}
                onChange={(e) => setMM(parseFloat(e.target.value))}
                className="w-16 accent-cyan-400 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-cyan-300">{MM.toFixed(2)}</span>
            </div>

            {/* Mode (m, n) */}
            <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
              <span className="text-xs text-slate-400 font-mono">Mode (m,n):</span>
              <select
                value={`${m},${n}`}
                onChange={(e) => {
                  const [newM, newN] = e.target.value.split(',').map(Number);
                  setM(newM);
                  setN(newN);
                }}
                className="bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300 px-2 py-1 rounded focus:outline-none"
              >
                <option value="0,0">(0, 0) Plane Wave</option>
                <option value="1,0">(1, 0) Dipole Mode</option>
                <option value="2,0">(2, 0) Quadrupole</option>
                <option value="1,1">(1, 1) Higher Radial</option>
                <option value="5,5">(5, 5) Thesis Benchmark</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4 Quantitative Rigor KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Takeoff Directivity Impact
            </span>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-amber-400 tabular-nums">
              &gt; 5.0 dB
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Lip flow acceleration shifts far-field certification noise
            </p>
          </div>

          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Current Mode Regime
            </span>
            <div className="text-xl sm:text-2xl font-mono font-bold truncate tabular-nums">
              {modeAnalysis.isInverseUpstream ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <Wind className="w-5 h-5 shrink-0" /> Inverse Upstream
                </span>
              ) : modeAnalysis.isPropagative ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-5 h-5 shrink-0" /> Propagative
                </span>
              ) : (
                <span className="text-indigo-400 flex items-center gap-1">
                  <Radio className="w-5 h-5 shrink-0" /> Evanescent
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Cutoff <MathView math="k_{cut} =" /> {modeAnalysis.cutoffWavenumber.toFixed(3)}
            </p>
          </div>

          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Benchmark Accuracy
            </span>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-cyan-400 tabular-nums">
              10⁻⁵
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Precision agreement on "Bouchon d'Aspirine" test
            </p>
          </div>

          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Max FEM Mesh Nodes
            </span>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-sky-400 tabular-nums">
              312,318
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Degrees of freedom inverted via parallel MUMPS
            </p>
          </div>
        </div>

        {/* Primary Dashboard Grid: Left Stage (7 cols) + Right Stage (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Live Aeroacoustic Wavefield + Mathematical Architecture */}
          <div className="lg:col-span-7 space-y-6">
            {/* Panel 1: Live Aeroacoustic Wavefield & Non-Linear Carrier Flow Engine */}
            <div id="simulator" className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    Chapter 5.5.3: Non-Linear Flow & Venturi Effect (Thesis Page 123)
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Mode ({m}, {n}) Propagation on Non-Linear Carrier Flow
                  </h3>
                </div>

                {/* Layer Mode Toggle */}
                <div className="flex flex-wrap items-center gap-1.5 p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <button
                    onClick={() => setWavefieldDisplayMode('split')}
                    className={`px-2.5 py-1 text-[11px] font-mono rounded transition-all ${
                      wavefieldDisplayMode === 'split'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Split: Wave (Top) / Flow (Below)
                  </button>
                  <button
                    onClick={() => setWavefieldDisplayMode('flow')}
                    className={`px-2.5 py-1 text-[11px] font-mono rounded transition-all ${
                      wavefieldDisplayMode === 'flow'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Non-Linear Flow & Venturi
                  </button>
                  <button
                    onClick={() => setWavefieldDisplayMode('acoustic')}
                    className={`px-2.5 py-1 text-[11px] font-mono rounded transition-all ${
                      wavefieldDisplayMode === 'acoustic'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Acoustic Wavefield
                  </button>
                  <button
                    onClick={() => setWavefieldDisplayMode('coupled')}
                    className={`px-2.5 py-1 text-[11px] font-mono rounded transition-all ${
                      wavefieldDisplayMode === 'coupled'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Coupled Overlay
                  </button>
                </div>
              </div>

              {/* Canvas Viewport */}
              <div className="p-4 bg-slate-950 flex flex-col items-center justify-center relative">
                <canvas
                  ref={waveCanvasRef}
                  width={640}
                  height={320}
                  className="rounded-lg border border-slate-800 w-full h-auto shadow-inner cursor-crosshair"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const scaleX = 640 / rect.width;
                    const scaleY = 320 / rect.height;
                    const x = (e.clientX - rect.left) * scaleX;
                    const y = (e.clientY - rect.top) * scaleY;
                    setHoverCanvasPos({ x, y });
                  }}
                  onMouseLeave={() => setHoverCanvasPos(null)}
                />

                {/* Colormap Legend Bar */}
                <div className="mt-3 w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-slate-400 px-1">
                  {wavefieldDisplayMode === 'split' ? (
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Top Half Legend: Acoustic Wave Phase */}
                      <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded border border-slate-800">
                        <span className="text-[10px] text-cyan-300 shrink-0 font-bold">↑ Wave Phase φ_a:</span>
                        <span className="text-[10px]">-1.0</span>
                        <div className="flex-1 h-2 rounded bg-gradient-to-r from-blue-700 via-cyan-400 via-yellow-400 to-red-600 border border-slate-800" />
                        <span className="text-[10px]">+1.0</span>
                      </div>
                      {/* Bottom Half Legend: Carrier Flow Mach with Venturi Hotspot */}
                      <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded border border-slate-800">
                        <span className="text-[10px] text-amber-300 shrink-0 font-bold">↓ Venturi Flow M_0:</span>
                        <span className="text-[10px]">0.00</span>
                        <div className="flex-1 h-2 rounded bg-gradient-to-r from-blue-900 via-sky-400 via-emerald-400 via-yellow-400 via-orange-500 to-red-600 border border-slate-800" />
                        <span className="text-[10px] text-rose-400 font-bold">M ≥ 0.85 (Lip Hotspot)</span>
                      </div>
                    </div>
                  ) : wavefieldDisplayMode === 'flow' ? (
                    <div className="w-full flex items-center justify-between">
                      <span>M = 0.0 (Far-field Stream)</span>
                      <div className="flex-1 mx-3 h-2.5 rounded bg-gradient-to-r from-blue-900 via-sky-400 via-emerald-400 via-yellow-400 via-orange-500 to-red-600 border border-slate-800" />
                      <span className="text-rose-400 font-bold">M ≥ 0.85 (Venturi Lip Hotspot)</span>
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-between">
                      <span>-1.0 (Phase Min)</span>
                      <div className="flex-1 mx-3 h-2.5 rounded bg-gradient-to-r from-blue-700 via-cyan-400 via-yellow-400 to-red-600 border border-slate-800" />
                      <span>+1.0 (Phase Max)</span>
                    </div>
                  )}
                </div>

                {/* Live Field Telemetry HUD (Below Canvas) */}
                <div className="w-full mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase">Axial Number β⁺</span>
                    <span className="text-cyan-300 font-bold tabular-nums text-sm">
                      {modeAnalysis.isPropagative
                        ? modeAnalysis.betaPlusReal.toFixed(3)
                        : `${modeAnalysis.betaPlusReal.toFixed(2)} + i${modeAnalysis.betaPlusImag.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase">Carrier Mach at Lip</span>
                    <span className="text-amber-400 font-bold tabular-nums text-sm">
                      M_lip = {(MM * 2.45 * (1 + Minf * 1.85) + MM).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Venturi Lip Hotspot</span>
                  </div>
                  <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase">Group Velocity v_g⁺</span>
                    <span className="text-emerald-400 font-bold tabular-nums text-sm">
                      {modeAnalysis.isPropagative ? `${modeAnalysis.groupVelocityPlus.toFixed(2)} c₀` : '0 (Evanescent)'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase">Active Display</span>
                    <span className="text-white font-bold tabular-nums text-sm">
                      {wavefieldDisplayMode === 'split'
                        ? 'Split: Wave / Flow'
                        : wavefieldDisplayMode === 'flow'
                        ? 'Carrier Mach Field'
                        : wavefieldDisplayMode === 'coupled'
                        ? 'Coupled Wave+Flow'
                        : 'Acoustic Wavefield'}
                    </span>
                    <span className="text-[10px] text-cyan-400 block">
                      {wavefieldDisplayMode === 'split' ? 'Non-linear flow visible below' : 'Continuous contour'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dedicated Non-Linear Potential Flow with Venturi Effect Panel (Page 117 & 126) */}
            <NacelleVenturiFlowVisualizer
              Minf={Minf}
              MM={MM}
              onSelectParams={(newMinf, newMM) => {
                setMinf(newMinf);
                setMM(newMM);
              }}
            />

            {/* Panel 2: The Symmetrized FEM-BEM Coupling System */}
            <div id="matrix-system" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" />
                    Chapter 4.3: Discrete FEM-BEM System (Eq 4.143)
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Coupled Linear System Solved via Parallel Schur Complement
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">CERFACS MUMPS</span>
              </div>

              {/* Symmetrized Matrix Equation */}
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-cyan-200 overflow-x-auto">
                <MathView
                  math={`\\begin{pmatrix}
                  A_{0m} - {}^t\\tilde{\\Theta}_s \\tilde{N} \\tilde{\\Theta}_s & A_{0m} X_{mn} & {}^t\\tilde{\\Theta}_s (-\\frac{\\tilde{I}}{2} + \\tilde{D}^*) \\tilde{\\Theta}_a \\\\
                  X_{mn'}^t A_{0m} & X_{mn'}^t A_{0m} X_{mn} - [\\mu_m^-] & 0 \\\\
                  {}^t\\tilde{\\Theta}_a (-\\frac{\\tilde{I}}{2} + \\tilde{D}) \\tilde{\\Theta}_s & 0 & -{}^t\\tilde{\\Theta}_a \\tilde{S} \\tilde{\\Theta}_a
                  \\end{pmatrix}
                  \\begin{pmatrix}
                  \\phi_a(s) \\\\
                  a_{mn}^- \\\\
                  \\frac{\\partial\\phi_a}{\\partial n_{A_0}}(a)
                  \\end{pmatrix}
                  =
                  \\begin{pmatrix}
                  A_{0m} X_{mn'} (a_{mn}^+) \\\\
                  (-X_{mn'}^t A_{0m} X_{mn'} + [\\mu_m^+])(a_{mn}^+) \\\\
                  0
                  \\end{pmatrix}`}
                  display={true}
                />
              </div>

              {/* Physical description of the 3 unknowns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
                  <span className="text-cyan-400 font-mono font-bold block mb-1">φ_a(s) — Volume FEM</span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Acoustic potential at each triangular mesh node in Ω (<MathView math="P^1" /> continuous elements).
                  </p>
                </div>
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
                  <span className="text-amber-400 font-mono font-bold block mb-1">a_{'{mn}'}⁻ — Modal Reflected</span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Acoustic reflection coefficients for incoming fan duct modes on <MathView math="\Gamma_M" />.
                  </p>
                </div>
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
                  <span className="text-emerald-400 font-mono font-bold block mb-1">∂φ_a/∂n — Boundary BEM</span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Conormal derivative per boundary segment on <MathView math="\Gamma_\infty" /> (<MathView math="P^0" /> elements).
                  </p>
                </div>
              </div>
            </div>

            {/* Panel 3: Axial Singularity Weighted Sobolev Innovation */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Chapter 5.1: Axial Singularity Resolution
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Natural Weighted Sobolev Element vs Mercier-Raugel
                  </h3>
                </div>
                <span className="text-xs font-mono text-emerald-400">O(h³) Rate</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                  <div className="text-slate-400 font-mono text-[11px] flex justify-between">
                    <span>Prior Art (Mercier-Raugel)</span>
                    <span className="text-rose-400">Forced Dirichlet</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Enforcing <MathView math="u(0, z) = 0" /> on axis nodes destroys natural degrees of freedom, causing severe boundary layer artifacts and slow mesh convergence.
                  </p>
                </div>

                <div className="p-4 bg-slate-950 rounded-lg border border-cyan-500/40 space-y-2">
                  <div className="text-cyan-300 font-mono text-[11px] flex justify-between font-bold">
                    <span>Stefan Duprey Natural Basis</span>
                    <span className="text-emerald-400">Exact Asymptotics</span>
                  </div>
                  <div className="text-cyan-200 font-mono text-[11px] text-center">
                    <MathView math="\tilde{u}_T(r, z) = \tilde{\alpha}\sqrt{r} + \tilde{\beta}r\sqrt{r} + \tilde{\gamma}\sqrt{r}z" />
                  </div>
                  <p className="text-slate-400 text-[10px] leading-tight">
                    Every axis node carries an active degree of freedom (<MathView math="\tilde{\alpha}" />), eradicating axis distortion even on coarse meshes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Directivity Radar + Nečas Fixed-Point + 3-Zone Architecture */}
          <div className="lg:col-span-5 space-y-6">
            {/* Panel 4: Far-Field Noise Directivity Radar (Matching Thesis Page 125 Figure 5.5.5) */}
            <div id="directivity" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" />
                    Chapter 5.5.5: Far-Field Directivity Radar (Fig 5.5.5, p. 125)
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Far-Field Radiation Polar Directivity |A(θ)|
                  </h3>
                </div>

                {/* Controls: Flight Mach M_inf toggle, Theme toggle, and Display mode */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Theme Toggle: Thesis White (Exact photo) vs Dark Console */}
                  <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-md">
                    <button
                      onClick={() => setPolarTheme('thesis')}
                      className={`px-2 py-1 text-[11px] font-mono rounded transition-all ${
                        polarTheme === 'thesis' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Exact thesis figure styling matching attached photo"
                    >
                      Thesis Paper (Exact p. 125)
                    </button>
                    <button
                      onClick={() => setPolarTheme('dark')}
                      className={`px-2 py-1 text-[11px] font-mono rounded transition-all ${
                        polarTheme === 'dark' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Dark Console
                    </button>
                  </div>

                  <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-md">
                    <button
                      onClick={() => setMinf(0.0)}
                      className={`px-2 py-1 text-[11px] font-mono rounded transition-all ${
                        Minf === 0.0 ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      M_∞ = 0 (Static)
                    </button>
                    <button
                      onClick={() => setMinf(0.1)}
                      className={`px-2 py-1 text-[11px] font-mono rounded transition-all ${
                        Minf === 0.1 ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      M_∞ = 0.1 (Flight)
                    </button>
                  </div>

                  <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-md">
                    <button
                      onClick={() => setPolarMode('linear')}
                      className={`px-2 py-1 text-[11px] font-mono rounded ${
                        polarMode === 'linear' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                      }`}
                    >
                      |A(θ)|
                    </button>
                    <button
                      onClick={() => setPolarMode('decibel')}
                      className={`px-2 py-1 text-[11px] font-mono rounded ${
                        polarMode === 'decibel' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                      }`}
                    >
                      dB(θ)
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub-header note showing mode and scale */}
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded border border-slate-800/80">
                <span>
                  Figure 5.5.5: Mode ({m}, {n}) Directivity |A(θ)| across Mach Numbers (Thesis Page 125)
                </span>
                <span className="text-amber-400 font-bold">
                  Scale: [0, 4] · Digitized Exact Curves
                </span>
              </div>

              {/* Exact Polar Plot SVG matching user attached photo (Figure 5.5.5) */}
              <div
                className={`w-full aspect-square relative rounded-lg border p-2 flex items-center justify-center transition-colors ${
                  polarTheme === 'thesis'
                    ? 'bg-white border-slate-300 shadow-xl'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <svg
                  viewBox="0 0 380 380"
                  className="w-full h-full overflow-visible select-none cursor-crosshair"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const cx = rect.width * (205 / 380);
                    const cy = rect.height * (190 / 380);
                    const x = e.clientX - rect.left - cx;
                    const y = -(e.clientY - rect.top - cy);
                    let deg = Math.round((Math.atan2(y, x) * 180) / Math.PI);
                    if (deg < 0) deg += 360;
                    setHoverPolarAngle(deg);
                  }}
                >
                  {/* Grid colors according to selected theme */}
                  {(() => {
                    const isThesis = polarTheme === 'thesis';
                    const gridColor = isThesis ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.16)';
                    const outerColor = isThesis ? '#111827' : 'rgba(255, 255, 255, 0.45)';
                    const textColor = isThesis ? '#111827' : '#94a3b8';
                    const cx = 205;
                    const cy = 190;
                    const rMax = 135; // outer circle radius (scale value 4)

                    return (
                      <>
                        {/* 4 Concentric Rings: circles 1, 2, 3 are dashed, circle 4 is solid (exact match to photo) */}
                        {[1, 2, 3, 4].map((val) => {
                          const r = (val / 4) * rMax;
                          const isOuter = val === 4;
                          return (
                            <circle
                              key={val}
                              cx={cx}
                              cy={cy}
                              r={r}
                              fill="none"
                              stroke={isOuter ? outerColor : gridColor}
                              strokeWidth={isOuter ? 1.3 : 0.85}
                              strokeDasharray={isOuter ? 'none' : '3,3'}
                            />
                          );
                        })}

                        {/* Scale Numbers along the 90° vertical ray (exact 1, 2, 3, 4 matching photo for m=1) */}
                        {[1, 2, 3, 4].map((step) => {
                          const val = (step / 4) * polarDirectivity.scaleMax;
                          const r = (step / 4) * rMax;
                          return (
                            <text
                              key={`scale-${step}`}
                              x={cx + 5}
                              y={cy - r + (step === 4 ? -4 : 8)}
                              fill={textColor}
                              fontSize="11"
                              fontFamily="KaTeX_Main, Times New Roman, serif"
                              fontWeight={isThesis ? '600' : 'normal'}
                            >
                              {Number.isInteger(val) ? val : val.toFixed(1)}
                            </text>
                          );
                        })}

                        {/* 12 Radial Spoke Lines at 30° intervals: all dashed matching photo */}
                        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                          const rad = (deg * Math.PI) / 180;
                          const x2 = cx + rMax * Math.cos(rad);
                          const y2 = cy - rMax * Math.sin(rad);
                          return (
                            <line
                              key={`spoke-${deg}`}
                              x1={cx}
                              y1={cy}
                              x2={x2}
                              y2={y2}
                              stroke={gridColor}
                              strokeWidth="0.8"
                              strokeDasharray="3,3"
                            />
                          );
                        })}

                        {/* Degree Numbers around the perimeter: 0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330 */}
                        {[
                          { deg: 0, x: cx + rMax + 14, y: cy + 4, anchor: 'start' as const },
                          { deg: 30, x: cx + 152 * Math.cos((30 * Math.PI) / 180), y: cy - 152 * Math.sin((30 * Math.PI) / 180) + 4, anchor: 'start' as const },
                          { deg: 60, x: cx + 152 * Math.cos((60 * Math.PI) / 180), y: cy - 152 * Math.sin((60 * Math.PI) / 180) + 4, anchor: 'start' as const },
                          { deg: 90, x: cx, y: cy - rMax - 14, anchor: 'middle' as const },
                          { deg: 120, x: cx + 152 * Math.cos((120 * Math.PI) / 180), y: cy - 152 * Math.sin((120 * Math.PI) / 180) + 4, anchor: 'end' as const },
                          { deg: 150, x: cx + 152 * Math.cos((150 * Math.PI) / 180), y: cy - 152 * Math.sin((150 * Math.PI) / 180) + 4, anchor: 'end' as const },
                          { deg: 180, x: cx - rMax - 12, y: cy + 4, anchor: 'end' as const },
                          { deg: 210, x: cx + 152 * Math.cos((210 * Math.PI) / 180), y: cy - 152 * Math.sin((210 * Math.PI) / 180) + 4, anchor: 'end' as const },
                          { deg: 240, x: cx + 152 * Math.cos((240 * Math.PI) / 180), y: cy - 152 * Math.sin((240 * Math.PI) / 180) + 4, anchor: 'end' as const },
                          { deg: 270, x: cx, y: cy + rMax + 16, anchor: 'middle' as const },
                          { deg: 300, x: cx + 152 * Math.cos((300 * Math.PI) / 180), y: cy - 152 * Math.sin((300 * Math.PI) / 180) + 4, anchor: 'start' as const },
                          { deg: 330, x: cx + 152 * Math.cos((330 * Math.PI) / 180), y: cy - 152 * Math.sin((330 * Math.PI) / 180) + 4, anchor: 'start' as const },
                        ].map(({ deg, x, y, anchor }) => (
                          <text
                            key={`deg-${deg}`}
                            x={x}
                            y={y}
                            fill={textColor}
                            fontSize="11"
                            fontFamily="KaTeX_Main, Times New Roman, serif"
                            fontWeight={isThesis ? '600' : 'normal'}
                            textAnchor={anchor}
                          >
                            {deg}
                          </text>
                        ))}

                        {/* 4 Exact Thesis Directivity Curves: Blue (M_M=0), Red (M_M=0.1), Green (M_M=0.2), Yellow (M_M=0.3) */}
                        {polarDirectivity.curves.map((curve) => {
                          const pathData = curve.pts
                            .map((p, idx) => {
                              const r = (p.linear / polarDirectivity.scaleMax) * rMax;
                              const rad = (p.theta * Math.PI) / 180;
                              const sx = cx + r * Math.cos(rad);
                              const sy = cy - r * Math.sin(rad);
                              return `${idx === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)}`;
                            })
                            .join(' ');

                          return (
                            <path
                              key={curve.id}
                              d={pathData}
                              fill="none"
                              stroke={curve.color}
                              strokeWidth={curve.id === 'm3' ? '2.1' : '1.8'}
                              strokeLinejoin="round"
                              className="transition-all"
                            />
                          );
                        })}

                        {/* Current Interactive Slider Mach Curve (Highlighted Dashed when custom) */}
                        {Math.abs(MM - 0.0) > 0.02 && Math.abs(MM - 0.1) > 0.02 && Math.abs(MM - 0.2) > 0.02 && Math.abs(MM - 0.3) > 0.02 && (
                          <path
                            d={polarDirectivity.currentPts
                              .map((p, idx) => {
                                const r = (p.linear / polarDirectivity.scaleMax) * rMax;
                                const rad = (p.theta * Math.PI) / 180;
                                const sx = cx + r * Math.cos(rad);
                                const sy = cy - r * Math.sin(rad);
                                return `${idx === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)}`;
                              })
                              .join(' ')}
                            fill="none"
                            stroke={isThesis ? '#4f46e5' : '#ffffff'}
                            strokeWidth="2.2"
                            strokeDasharray="4,2"
                          />
                        )}

                        {/* Hover probe ray */}
                        <line
                          x1={cx}
                          y1={cy}
                          x2={cx + rMax * Math.cos((hoverPolarAngle * Math.PI) / 180)}
                          y2={cy - rMax * Math.sin((hoverPolarAngle * Math.PI) / 180)}
                          stroke={isThesis ? '#d97706' : '#f59e0b'}
                          strokeWidth="1.5"
                          strokeDasharray="3,3"
                        />
                        <circle
                          cx={cx + (polarDirectivity.linCur / 4.0) * rMax * Math.cos((hoverPolarAngle * Math.PI) / 180)}
                          cy={cy - (polarDirectivity.linCur / 4.0) * rMax * Math.sin((hoverPolarAngle * Math.PI) / 180)}
                          r="4"
                          fill={isThesis ? '#d97706' : '#f59e0b'}
                          stroke={isThesis ? '#ffffff' : '#0f172a'}
                          strokeWidth="1.5"
                        />

                        {/* Embedded LaTeX Legend in bottom-left (exact replica of user's attached photo) */}
                        <g transform="translate(18, 305)">
                          {/* Blue line: M_M = 0.0 */}
                          <line x1="0" y1="0" x2="16" y2="0" stroke="#0284c7" strokeWidth="2.0" />
                          <text x="22" y="4" fill={isThesis ? '#111827' : '#cbd5e1'} fontSize="13" fontFamily="KaTeX_Main, Times New Roman, serif" fontStyle="italic">
                            M<tspan fontStyle="normal" fontSize="10" dy="3">M</tspan><tspan dy="-3" fontStyle="normal"> = 0.0</tspan>
                          </text>

                          {/* Red line: M_M = 0.1 */}
                          <line x1="0" y1="18" x2="16" y2="18" stroke="#dc2626" strokeWidth="2.0" />
                          <text x="22" y="22" fill={isThesis ? '#111827' : '#cbd5e1'} fontSize="13" fontFamily="KaTeX_Main, Times New Roman, serif" fontStyle="italic">
                            M<tspan fontStyle="normal" fontSize="10" dy="3">M</tspan><tspan dy="-3" fontStyle="normal"> = 0.1</tspan>
                          </text>

                          {/* Green line: M_M = 0.2 */}
                          <line x1="0" y1="36" x2="16" y2="36" stroke="#16a34a" strokeWidth="2.0" />
                          <text x="22" y="40" fill={isThesis ? '#111827' : '#cbd5e1'} fontSize="13" fontFamily="KaTeX_Main, Times New Roman, serif" fontStyle="italic">
                            M<tspan fontStyle="normal" fontSize="10" dy="3">M</tspan><tspan dy="-3" fontStyle="normal"> = 0.2</tspan>
                          </text>

                          {/* Yellow line: M_M = 0.3 */}
                          <line x1="0" y1="54" x2="16" y2="54" stroke="#eab308" strokeWidth="2.0" />
                          <text x="22" y="58" fill={isThesis ? '#111827' : '#cbd5e1'} fontSize="13" fontFamily="KaTeX_Main, Times New Roman, serif" fontStyle="italic">
                            M<tspan fontStyle="normal" fontSize="10" dy="3">M</tspan><tspan dy="-3" fontStyle="normal"> = 0.3</tspan>
                          </text>
                        </g>
                      </>
                    );
                  })()}
                </svg>

                {/* Probe HUD overlay (bottom-right) */}
                <div className="absolute top-2 right-2 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-2.5 py-1.5 rounded-md flex flex-col items-end text-[11px] font-mono shadow-md">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">θ:</span>
                    <span className="text-amber-400 font-bold">{hoverPolarAngle}°</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-cyan-300 font-bold">|A| = {polarDirectivity.linCur.toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    M_M = {MM.toFixed(2)} {Minf > 0 ? `(M_∞=${Minf.toFixed(1)})` : '(Static)'}
                  </div>
                </div>
              </div>

              {/* Exact 4-Color Legend matching Page 125 Figure 5.5.5 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
                <div className="p-1.5 bg-slate-950/70 border border-slate-800 rounded flex items-center gap-2">
                  <span className="w-3 h-1 bg-[#0284c7] rounded-full inline-block shrink-0" />
                  <span className="text-slate-300">M_M = 0.0</span>
                </div>
                <div className="p-1.5 bg-slate-950/70 border border-slate-800 rounded flex items-center gap-2">
                  <span className="w-3 h-1 bg-[#dc2626] rounded-full inline-block shrink-0" />
                  <span className="text-slate-300">M_M = 0.1</span>
                </div>
                <div className="p-1.5 bg-slate-950/70 border border-slate-800 rounded flex items-center gap-2">
                  <span className="w-3 h-1 bg-[#16a34a] rounded-full inline-block shrink-0" />
                  <span className="text-slate-300">M_M = 0.2</span>
                </div>
                <div className="p-1.5 bg-slate-950/70 border border-slate-800 rounded flex items-center gap-2">
                  <span className="w-3 h-1 bg-[#eab308] rounded-full inline-block shrink-0" />
                  <span className="text-slate-300">M_M = 0.3</span>
                </div>
              </div>
            </div>

            {/* Panel 5: Nečas Fixed-Point Carrier Flow Solver */}
            <div id="potential-flow" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5" />
                    Chapter 4.2.1: Carrier Flow Solver
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Nečas Fixed-Point Cobweb (Eq 4.63)
                  </h3>
                </div>
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                  fixedPointResult.converged ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {fixedPointResult.converged ? 'Converged' : 'Sonic Blow-up'}
                </span>
              </div>

              {/* Cobweb Chart */}
              <div className="w-full aspect-[16/10] bg-slate-950 rounded-lg border border-slate-800 p-2 relative flex items-center justify-center">
                <svg viewBox="0 0 280 180" className="w-full h-full">
                  <line x1="30" y1="150" x2="260" y2="150" stroke="#64748b" strokeWidth="1" />
                  <line x1="30" y1="20" x2="30" y2="150" stroke="#64748b" strokeWidth="1" />
                  <line x1="30" y1="150" x2="240" y2="40" stroke="#475569" strokeWidth="1" strokeDasharray="3,3" />

                  {/* Sonic threshold line c_* */}
                  <line
                    x1={30 + (cStar / 1.6) * 220}
                    y1="20"
                    x2={30 + (cStar / 1.6) * 220}
                    y2="150"
                    stroke="#f43f5e"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />

                  {/* Curve y = f_q(v) */}
                  <path
                    d={Array.from({ length: 50 }, (_, i) => {
                      const v = (i / 50) * 1.5;
                      const rho = flowDensity(v, Minf, 1.4);
                      const fq = rho > 0.05 ? massFlux / rho : 2.5;
                      const sx = 30 + (v / 1.6) * 220;
                      const sy = 150 - (fq / 1.8) * 130;
                      return `${i === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                  />

                  {/* Steps with cobweb teal dots matching thesis figure */}
                  {fixedPointResult.steps.slice(0, 10).map((st, i) => {
                    if (st.v_in > 1.6 || st.v_out > 1.8) return null;
                    const xIn = 30 + (st.v_in / 1.6) * 220;
                    const yOut = 150 - (st.v_out / 1.8) * 130;
                    const xNext = 30 + (st.v_out / 1.6) * 220;
                    return (
                      <g key={i}>
                        <line
                          x1={xIn}
                          y1={i === 0 ? 150 : 150 - (st.v_in / 1.8) * 130}
                          x2={xIn}
                          y2={yOut}
                          stroke="#22c55e"
                          strokeWidth="1.5"
                        />
                        <line x1={xIn} y1={yOut} x2={xNext} y2={yOut} stroke="#eab308" strokeWidth="1.2" strokeDasharray="2,2" />
                        <circle cx={xIn} cy={yOut} r="2.5" fill="#14b8a6" stroke="#042f2e" strokeWidth="0.5" />
                      </g>
                    );
                  })}
                </svg>

                <div className="absolute top-3 right-3 text-[10px] font-mono text-slate-400 bg-slate-900/90 px-2 py-1 rounded border border-slate-800">
                  v* = {fixedPointResult.converged ? fixedPointResult.finalV.toFixed(4) : 'DIV'} · c* = {cStar.toFixed(3)}
                </div>
              </div>

              {/* Mass flux scrubber centered at q = 0.50 */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">Imposed Mass Flux (q):</span>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-300 font-bold tabular-nums">q = {massFlux.toFixed(2)}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans ${
                      fixedPointResult.converged ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'
                    }`}>
                      {fixedPointResult.converged ? 'Subcritical' : 'Choked'}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.02"
                  value={massFlux}
                  onChange={(e) => setMassFlux(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-0.5">
                  <button onClick={() => setMassFlux(0.3)} className="hover:text-cyan-300 transition-colors">
                    q = 0.3 (Convergent)
                  </button>
                  <button onClick={() => setMassFlux(0.5)} className="text-cyan-400/80 hover:text-cyan-300 font-bold transition-colors">
                    q = 0.5 (Default Middle)
                  </button>
                  <button onClick={() => setMassFlux(0.7)} className="hover:text-amber-400 transition-colors">
                    q = 0.7 (Choked)
                  </button>
                </div>
              </div>
            </div>

            {/* Panel 6: Interactive 3-Zone Architecture Mini-Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  3-Zone Domain Decomposition
                </div>
                <span className="text-xs font-mono text-slate-400">Chapter 1</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                <button
                  onClick={() => setActiveZoneDetail('zone1')}
                  className={`p-2 rounded border text-center transition-all ${
                    activeZoneDetail === 'zone1' ? 'bg-red-950/40 border-red-500/50 text-red-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Zone 1 (Core)
                </button>
                <button
                  onClick={() => setActiveZoneDetail('zone2')}
                  className={`p-2 rounded border text-center transition-all ${
                    activeZoneDetail === 'zone2' ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Zone 2 (FEM)
                </button>
                <button
                  onClick={() => setActiveZoneDetail('zone3')}
                  className={`p-2 rounded border text-center transition-all ${
                    activeZoneDetail === 'zone3' ? 'bg-sky-950/40 border-sky-500/50 text-sky-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Zone 3 (BEM)
                </button>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
                {activeZoneDetail === 'zone1' && (
                  <p className="text-slate-300 leading-relaxed">
                    <strong className="text-red-400 font-mono">Zone 1 (Ω_i):</strong> Engine turbofan blades & jet shear layer. Compressible Navier-Stokes equations with Lighthill quadrupole noise sources. Transferred to acoustics as modal source coefficients <MathView math="a_{mn}^+" /> on <MathView math="\Gamma_M" />.
                  </p>
                )}
                {activeZoneDetail === 'zone2' && (
                  <p className="text-slate-300 leading-relaxed">
                    <strong className="text-cyan-400 font-mono">Zone 2 (Ω):</strong> Near-field domain enclosing nacelle lip. Non-linear potential carrier flow with Venturi acceleration + linearized convected Helmholtz PDE solved with <MathView math="P^1" /> triangular finite elements.
                  </p>
                )}
                {activeZoneDetail === 'zone3' && (
                  <p className="text-slate-300 leading-relaxed">
                    <strong className="text-sky-400 font-mono">Zone 3 (Ω_e):</strong> Far-field uniform flight flow. Lorentz space-time transformation cancels convective terms, mapping to standard Helmholtz boundary integrals with Doppler dilation on <MathView math="\Gamma_\infty" />.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section: Comprehensive KaTeX Formula Library & Compendium */}
        <div id="formulae" className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <BookMarked className="w-3.5 h-3.5" />
                Mathematical Compendium
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Fundamental Equations of Stefan Duprey's Dissertation
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Interactive KaTeX Render
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Formula 1 */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <span className="text-xs font-mono text-cyan-400">1. Lorentz Frequency Transform</span>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 text-cyan-200 text-xs overflow-x-auto">
                <MathView
                  math="z' = \frac{z}{\sqrt{1-M_\infty^2}}, \quad \tilde{\phi}_a' = \tilde{\phi}_a e^{-i\frac{k_\infty M_\infty}{\sqrt{1-M_\infty^2}}z'}"
                  display={true}
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cancels carrier convection at infinity, converting convected wave equations into standard Helmholtz with Doppler shifted wavenumber <MathView math="k'_\infty = k_\infty/\sqrt{1-M_\infty^2}" />.
              </p>
            </div>

            {/* Formula 2 */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <span className="text-xs font-mono text-cyan-400">2. Calderón Hypersingular Regularization</span>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 text-cyan-200 text-xs overflow-x-auto">
                <MathView
                  math="\langle -N(p), p' \rangle = \iint G \left[ \vec{\operatorname{rot}}_\Gamma p \cdot \vec{\operatorname{rot}}_\Gamma p' - k^2 (\vec{n}_x \cdot \vec{n}_y) p p' \right]"
                  display={true}
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Weak-form integration by parts that reduces non-integrable <MathView math="1/R^3" /> hypersingular kernels to integrable single-layer orders.
              </p>
            </div>

            {/* Formula 3 */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <span className="text-xs font-mono text-cyan-400">3. Natural Weighted Axis Element</span>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 text-cyan-200 text-xs overflow-x-auto">
                <MathView
                  math="\tilde{u}_T(r, z) = \tilde{\alpha}\sqrt{r} + \tilde{\beta}r\sqrt{r} + \tilde{\gamma}\sqrt{r}z \in H_{0,a}^1(\Omega)"
                  display={true}
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Resolves the <MathView math="m^2 \int_\Omega \frac{p p'}{r}" /> axis singularity naturally, achieving cubic convergence without artificial boundary constraints.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-800 bg-slate-950 py-6 px-6 text-xs text-slate-400">
        <div className="max-w-[1520px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-white font-semibold">
              Etude mathématique et numérique de la propagation acoustique d'un turboréacteur
            </span>
            <div className="text-slate-500 font-mono text-[11px] mt-0.5">
              Dr. Stefan Duprey · Université Henri Poincaré - Nancy 1 & EADS-CCR Suresnes (2006) · NNT: 2006NAN10185
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://tel.archives-ouvertes.fr/tel-01746556v2"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono transition-colors"
            >
              <span>HAL ID: tel-01746556v2</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={() => setIsBibtexOpen(true)}
              className="text-slate-300 hover:text-white transition-colors underline"
            >
              Academic Citation (BibTeX)
            </button>
          </div>
        </div>
      </footer>

      {/* BibTeX Reference Modal */}
      <BibtexModal isOpen={isBibtexOpen} onClose={() => setIsBibtexOpen(false)} />

      {/* Permanent CV & Deployment Guide Modal */}
      <DeployGuideModal isOpen={isDeployGuideOpen} onClose={() => setIsDeployGuideOpen(false)} />
    </div>
  );
}
