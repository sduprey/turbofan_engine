import React, { useState } from 'react';
import { Layers, ShieldCheck, ArrowRight, BookOpen, Cpu, Compass } from 'lucide-react';
import { MathView } from './MathView';

type ZoneId = 'zone1' | 'zone2' | 'zone3' | 'gammaM' | 'gammaR' | 'gammaInf';

interface ZoneDetail {
  id: ZoneId;
  name: string;
  domainSymbol: string;
  shortDesc: string;
  physics: string;
  pde: string;
  boundaryCond: string;
  numericalMethod: string;
  rationale: string;
}

const ZONES: Record<ZoneId, ZoneDetail> = {
  zone1: {
    id: 'zone1',
    name: 'Zone 1: Engine Core & Jet Discontinuity',
    domainSymbol: '\\Omega_i',
    shortDesc: 'Fan blades, stator vanes, combustion, and downstream shear layer jet.',
    physics: 'Full compressible Navier-Stokes + entropy equation. Transonic shock waves on blade tips, vortex shedding, Lighthill quadrupole acoustic noise sources.',
    pde: '\\frac{d\\vec{v}}{dt} + \\frac{\\vec{\\nabla}p}{\\rho} = 0, \\quad \\frac{\\partial\\rho}{\\partial t} + \\operatorname{div}(\\rho\\vec{v}) = 0',
    boundaryCond: 'Replaced on fictitious plane \\Gamma_M by acoustic source modal coefficients.',
    numericalMethod: 'CFD (Complex non-linear solvers / measured test data from engine manufacturers). Excluded from whole-aircraft acoustics to keep calculation tractable.',
    rationale: 'Too costly to simulate across whole flight domain; acoustic data is condensed onto \\Gamma_M as modal source vectors a_{mn}^+.',
  },
  gammaM: {
    id: 'gammaM',
    name: 'Boundary Γ_M: Modal Engine Interface',
    domainSymbol: '\\Gamma_M',
    shortDesc: 'Fictitious boundary in the intake duct separating Zone 1 and Zone 2.',
    physics: 'Linear acoustics in uniform duct flow. Guided acoustic waveguide modes.',
    pde: '\\frac{\\partial(\\phi_a - \\phi_{a,\\text{inc}})}{\\partial n_{A_0}} = T_M(\\phi_a - \\phi_{a,\\text{inc}})',
    boundaryCond: 'Modal Dirichlet-Neumann operator matching incident \\Xi_{mn}^+ and reflected \\Xi_{mn}^- modes.',
    numericalMethod: 'Semi-analytical modal expansion discretized directly into matrix blocks via Bessel zero projections.',
    rationale: 'Truncates the infinite engine duct cleanly without spurious wave reflection, using exact analytic duct impedance.',
  },
  zone2: {
    id: 'zone2',
    name: 'Zone 2: Near-Field Flow & Acoustics',
    domainSymbol: '\\Omega',
    shortDesc: 'Volume immediately surrounding the nacelle lip with flow acceleration.',
    physics: 'Stationary non-linear potential carrier flow + Linearized potential acoustics with Doppler convection.',
    pde: '\\operatorname{div}\\left(F_\\infty(|\\vec{\\nabla}\\phi_0|^2)\\vec{\\nabla}\\phi_0\\right) = 0, \\quad A_0(\\phi_a) = 0',
    boundaryCond: 'Slip condition \\rho_0 \\vec{v}_0 \\cdot \\vec{n} = 0 on \\Gamma_R; continuous trace coupling on \\Gamma_\\infty.',
    numericalMethod: 'Finite Element Method (FEM) P^1 continuous on unstructured triangular meshes (up to 312,000+ DoFs in PA2R).',
    rationale: 'Captures the crucial Venturi acceleration at the nacelle lip that alters acoustic wavelengths and directivity by > 5 dB.',
  },
  gammaR: {
    id: 'gammaR',
    name: 'Boundary Γ_R: Rigid Nacelle Wall',
    domainSymbol: '\\Gamma_R',
    shortDesc: 'Acoustically hard engine cowl and intake duct wall.',
    physics: 'Acoustic total reflection and non-penetration fluid slip.',
    pde: '\\vec{v}_0 \\cdot \\vec{n} = 0, \\quad \\frac{\\partial\\phi_a}{\\partial n_{A_0}} = 0',
    boundaryCond: 'Homogeneous Neumann condition for both carrier flow and acoustic wave potential.',
    numericalMethod: 'Natural boundary condition in variational weak form; zero boundary flux integrals.',
    rationale: 'Acoustic liner honeycomb treatment can be added as frequency-dependent impedance Robin condition.',
  },
  gammaInf: {
    id: 'gammaInf',
    name: 'Boundary Γ_∞: Fictitious Coupling Boundary',
    domainSymbol: '\\Gamma_\\infty',
    shortDesc: 'Smooth convex boundary enclosing the local flow heterogeneity.',
    physics: 'Interface between non-uniform near-field flow and uniform far-field flow.',
    pde: '\\text{Lorentz-transformed Calderón integral equations on } \\Gamma_\\infty',
    boundaryCond: 'Transparent radiation coupling: (I/2 - D)(p) + S(\\partial p/\\partial n) = 0',
    numericalMethod: 'Boundary Element Method (BEM) P^0 constant elements on 1D boundary profile, accelerated by Schur complement.',
    rationale: 'Unlike PML or infinite elements which require giant spheres or boxes, Γ_∞ can fit the flow closely, saving 80%+ mesh volume.',
  },
  zone3: {
    id: 'zone3',
    name: 'Zone 3: Exterior Far-Field Radiation',
    domainSymbol: '\\Omega_e',
    shortDesc: 'Infinite uniform flow field representing the aircraft cruising or takeoff velocity.',
    physics: 'Homogeneous fluid in uniform motion v_0 = -M_\\infty a_\\infty e_z.',
    pde: '\\frac{1}{a_\\infty^2}\\frac{\\partial^2\\phi_a}{\\partial t^2} - \\Delta\\phi_a + 2\\frac{M_\\infty}{a_\\infty}\\frac{\\partial^2\\phi_a}{\\partial t\\partial z} + M_\\infty^2\\frac{\\partial^2\\phi_a}{\\partial z^2} = 0',
    boundaryCond: 'Convected Sommerfeld radiation condition at infinity: \\lim_{R\\to\\infty} \\int_{S_R} |\\partial\\phi_a/\\partial n - ik_\\infty\'\\phi_a|^2 d\\gamma = 0',
    numericalMethod: 'Solved analytically via the Lorentz transformation diffeomorphism mapping into free-space Green kernel G(x, y) = \\frac{e^{ik|x-y|}}{4\\pi|x-y|}.',
    rationale: 'Eliminates infinite domain meshing; converts exterior PDE to boundary integrals on Γ_∞.',
  },
};

export const DomainDecompositionMap: React.FC = () => {
  const [activeZone, setActiveZone] = useState<ZoneId>('zone2');

  const zone = ZONES[activeZone];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 mb-1 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Chapter 1.1 - 1.2: 3-Zone Geographical Domain Decomposition
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Nacelle Axisymmetric Architecture & Coupled Subdomains
          </h3>
          <p className="text-sm text-slate-400 mt-0.5">
            Decomposing the aircraft into zones of increasing physical complexity to make full-scale aeroacoustics tractable.
          </p>
        </div>

        {/* Quick selector buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-lg">
          {(['zone1', 'gammaM', 'zone2', 'gammaR', 'gammaInf', 'zone3'] as ZoneId[]).map((zid) => (
            <button
              key={zid}
              onClick={() => setActiveZone(zid)}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-all ${
                activeZone === zid
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {zid === 'zone1' ? 'Zone 1 (Core)' :
               zid === 'gammaM' ? 'Γ_M (Modal)' :
               zid === 'zone2' ? 'Zone 2 (FEM)' :
               zid === 'gammaR' ? 'Γ_R (Wall)' :
               zid === 'gammaInf' ? 'Γ_∞ (BEM)' :
               'Zone 3 (Far)'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Interactive SVG Diagram */}
        <div className="lg:col-span-6 p-6 bg-slate-950/70 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col items-center justify-center">
          <div className="w-full max-w-[500px] aspect-[4/3] relative bg-slate-950 rounded-lg border border-slate-800 p-2 overflow-hidden">
            <svg viewBox="0 0 520 380" className="w-full h-full select-none">
              {/* Definitions for gradients and patterns */}
              <defs>
                <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#0369a1" stopOpacity="0.05" />
                </linearGradient>
                <pattern id="meshPattern" width="12" height="12" patternUnits="userSpaceOnUse">
                  <path d="M 12 0 L 0 12 M 0 0 L 12 12" fill="none" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="0.8" />
                </pattern>
              </defs>

              {/* Axis line (r = 0, z-axis) */}
              <line x1="20" y1="340" x2="500" y2="340" stroke="#64748b" strokeWidth="1.5" strokeDasharray="6,4" />
              <text x="500" y="355" fill="#94a3b8" fontSize="12" fontFamily="JetBrains Mono">z (Axis of revolution)</text>
              <line x1="160" y1="340" x2="160" y2="20" stroke="#64748b" strokeWidth="1.5" />
              <text x="170" y="30" fill="#94a3b8" fontSize="12" fontFamily="JetBrains Mono">r (Radial)</text>

              {/* Zone 3: Far-Field Background */}
              <rect
                x="20"
                y="20"
                width="480"
                height="320"
                fill={activeZone === 'zone3' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.3)'}
                stroke={activeZone === 'zone3' ? '#38bdf8' : 'none'}
                strokeWidth="1.5"
                className="cursor-pointer transition-all"
                onClick={() => setActiveZone('zone3')}
              />
              <text x="420" y="60" fill={activeZone === 'zone3' ? '#38bdf8' : '#64748b'} fontSize="14" fontFamily="JetBrains Mono" fontWeight="bold">
                Ω_e (Zone 3)
              </text>

              {/* Γ_∞: Fictitious radiation boundary */}
              <path
                d="M 60 340 C 60 120, 240 70, 440 90 L 440 340"
                fill="none"
                stroke={activeZone === 'gammaInf' ? '#f59e0b' : '#38bdf8'}
                strokeWidth={activeZone === 'gammaInf' ? 3.5 : 2}
                strokeDasharray="4,4"
                className="cursor-pointer transition-all"
                onClick={() => setActiveZone('gammaInf')}
              />
              <text x="350" y="80" fill={activeZone === 'gammaInf' ? '#f59e0b' : '#38bdf8'} fontSize="12" fontFamily="JetBrains Mono" fontWeight="bold">
                Γ_∞ (BEM Boundary)
              </text>

              {/* Zone 2 (Near field Ω): Area between Γ_∞, nacelle wall, and Γ_M */}
              <path
                d="M 60 340 C 60 140, 220 90, 420 110 L 420 180 C 330 170, 240 180, 200 240 L 200 340 Z"
                fill={activeZone === 'zone2' ? 'rgba(6, 182, 212, 0.25)' : 'rgba(30, 41, 59, 0.6)'}
                stroke={activeZone === 'zone2' ? '#06b6d4' : 'rgba(255,255,255,0.1)'}
                strokeWidth={activeZone === 'zone2' ? 2 : 1}
                className="cursor-pointer transition-all"
                onClick={() => setActiveZone('zone2')}
              />
              {/* Optional mesh pattern overlay in Zone 2 */}
              <path
                d="M 60 340 C 60 140, 220 90, 420 110 L 420 180 C 330 170, 240 180, 200 240 L 200 340 Z"
                fill="url(#meshPattern)"
                opacity="0.6"
                pointerEvents="none"
              />
              <text x="130" y="210" fill={activeZone === 'zone2' ? '#22d3ee' : '#94a3b8'} fontSize="15" fontFamily="JetBrains Mono" fontWeight="bold">
                Ω (Zone 2 - FEM)
              </text>

              {/* Nacelle Cowl Body (Rigid Solid - Aerodynamic Profile from Page 123) */}
              <path
                d="M 200 240 C 240 238, 320 225, 380 215 C 398 212, 412 216, 415 224 C 418 232, 404 238, 380 244 C 330 256, 260 268, 200 274 Z"
                fill="#334155"
                stroke={activeZone === 'gammaR' ? '#ec4899' : '#38bdf8'}
                strokeWidth={activeZone === 'gammaR' ? 3 : 2}
                className="cursor-pointer transition-all hover:fill-slate-600"
                onClick={() => setActiveZone('gammaR')}
              />
              <text x="270" y="248" fill={activeZone === 'gammaR' ? '#f472b6' : '#cbd5e1'} fontSize="11" fontFamily="JetBrains Mono">
                Γ_R (Nacelle Cowl - Page 123)
              </text>

              {/* Zone 1: Engine Core & Fan Interior */}
              <path
                d="M 200 240 L 200 340 L 120 340 L 120 250 Z"
                fill={activeZone === 'zone1' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(71, 85, 105, 0.4)'}
                stroke={activeZone === 'zone1' ? '#ef4444' : '#475569'}
                strokeWidth={activeZone === 'zone1' ? 2.5 : 1}
                className="cursor-pointer transition-all"
                onClick={() => setActiveZone('zone1')}
              />
              <text x="130" y="300" fill={activeZone === 'zone1' ? '#f87171' : '#94a3b8'} fontSize="12" fontFamily="JetBrains Mono" fontWeight="bold">
                Zone 1 (Core)
              </text>

              {/* Γ_M: Modal Interface */}
              <line
                x1="200"
                y1="240"
                x2="200"
                y2="340"
                stroke={activeZone === 'gammaM' ? '#a855f7' : '#ec4899'}
                strokeWidth={activeZone === 'gammaM' ? 4 : 2.5}
                className="cursor-pointer transition-all"
                onClick={() => setActiveZone('gammaM')}
              />
              <text x="208" y="270" fill={activeZone === 'gammaM' ? '#c084fc' : '#f472b6'} fontSize="12" fontFamily="JetBrains Mono" fontWeight="bold">
                Γ_M (z = 0)
              </text>

              {/* Fan intake flow streamlines */}
              <g stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.4" fill="none">
                <path d="M 400 130 C 330 135, 260 170, 220 250" />
                <path d="M 400 150 C 340 160, 280 200, 220 270" />
                <path d="M 400 170 C 350 180, 290 230, 220 290" />
              </g>
            </svg>

            {/* Helper pill */}
            <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-md text-[11px] font-mono text-slate-300">
              Interactive map: Click any boundary or zone to inspect formulation
            </div>
          </div>
        </div>

        {/* Right: Technical Inspector for Selected Zone */}
        <div className="lg:col-span-6 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div>
                <span className="text-xs font-mono text-cyan-400 block">Domain Specifications</span>
                <h4 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  {zone.name}
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                    <MathView math={zone.domainSymbol} />
                  </span>
                </h4>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {zone.shortDesc}
            </p>

            {/* Scientific Details */}
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950/80 rounded border border-slate-800">
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-mono mb-1">
                  Governing Partial Differential Equation
                </span>
                <div className="text-cyan-300 font-mono py-1">
                  <MathView math={zone.pde} display={true} />
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded border border-slate-800">
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-mono mb-1">
                  Boundary Condition / Coupling Principle
                </span>
                <div className="text-slate-200 leading-relaxed font-mono text-[11px]">
                  <MathView math={zone.boundaryCond} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-mono mb-0.5">
                    Numerical Method
                  </span>
                  <span className="text-white text-[11px] leading-snug block">
                    {zone.numericalMethod}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-950/80 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-mono mb-0.5">
                    Physical Rationale
                  </span>
                  <span className="text-slate-300 text-[11px] leading-snug block">
                    {zone.rationale}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Theoretical Takeaway */}
          <div className="p-3 bg-cyan-950/20 border border-cyan-900/40 rounded-lg text-xs text-slate-300">
            <span className="text-cyan-300 font-semibold block mb-0.5">
              Why this decomposition matters:
            </span>
            By isolating the turbulent jet and combustion in Zone 1 as incoming duct modal source data <MathView math="a_{mn}^+" />, the code solves the entire external propagation using linear acoustics on non-linear potential carrier flow, reducing computational cost by orders of magnitude while preserving aircraft certification fidelity!
          </div>
        </div>
      </div>
    </div>
  );
};
