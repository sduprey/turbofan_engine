import React, { useState } from 'react';
import { Cpu, Layers, GitBranch, Shield, Zap, Database } from 'lucide-react';
import { MathView } from './MathView';

type BlockKey = 'A00' | 'A01' | 'A02' | 'A10' | 'A11' | 'A12' | 'A20' | 'A21' | 'A22';

interface BlockInfo {
  name: string;
  math: string;
  nature: 'Sparse (FEM)' | 'Dense (BEM)' | 'Modal Matrix' | 'Zero Block';
  description: string;
  role: string;
  solver: string;
}

const MATRIX_BLOCKS: Record<BlockKey, BlockInfo> = {
  A00: {
    name: 'Volume Stiffness + Hypersingular BEM',
    math: 'A_{0m} - {}^t\\tilde{\\Theta}_s \\tilde{N} \\tilde{\\Theta}_s',
    nature: 'Sparse (FEM)',
    description: 'Volume Helmholtz stiffness operator in near-field domain Ω coupled with hypersingular boundary operator N on Γ_∞.',
    role: 'Represents acoustic wave propagation through non-uniform carrier flow, plus external boundary radiation stiffness.',
    solver: 'Factorized via parallel sparse solver MUMPS (CERFACS) during the first step of the Schur complement.',
  },
  A01: {
    name: 'Volume-to-Modal Coupling',
    math: 'A_{0m} X_{mn}',
    nature: 'Modal Matrix',
    description: 'Projection of duct transverse modes X_{mn} onto the volume finite element mesh nodes.',
    role: 'Couples the continuous volume acoustic field inside the intake duct with the analytical cylindrical Bessel modes.',
    solver: 'Rectangular matrix product with modal vector column basis.',
  },
  A02: {
    name: 'Adjoint Double-Layer Boundary Coupling',
    math: '{}^t\\tilde{\\Theta}_s (-\\frac{\\tilde{I}}{2} + \\tilde{D}^*) \\tilde{\\Theta}_a',
    nature: 'Dense (BEM)',
    description: 'Transposed trace operator combining identity jump and adjoint double-layer operator D*.',
    role: 'Connects the volume acoustic potential with the exterior conormal derivative on the fictitious radiation surface Γ_∞.',
    solver: 'Dense boundary block evaluated by numerical Gauss-Legendre quadrature with singularity extraction.',
  },
  A10: {
    name: 'Modal-to-Volume Transpose Coupling',
    math: 'X_{mn\'}^t A_{0m}',
    nature: 'Modal Matrix',
    description: 'Hermitian transpose of the volume-to-modal projection block.',
    role: 'Ensures reciprocity and conservation of modal acoustic energy between duct waveguide and volume mesh.',
    solver: 'Exact transpose of block A01.',
  },
  A11: {
    name: 'Modal Impedance & Dirichlet-Neumann',
    math: 'X_{mn\'}^t A_{0m} X_{mn} - [\\mu_m^-]',
    nature: 'Modal Matrix',
    description: 'Modal matrix reduced to propagative duct modes minus the Dirichlet-Neumann diagonal impedance matrix [μ_m^-].',
    role: 'Absorbs reflected acoustic modes a_{mn}^- without spurious non-physical reflections back into the computational domain.',
    solver: 'Small dense/diagonal matrix whose size equals the number of cut-on propagative modes (typically 5 to 30 modes).',
  },
  A12: {
    name: 'Modal-Boundary Decoupling',
    math: '0',
    nature: 'Zero Block',
    description: 'Zero block: duct modes at Γ_M have no direct compact support with the far radiation boundary Γ_∞.',
    role: 'Duct modes only communicate with the exterior boundary via the intermediate volume domain Ω.',
    solver: 'Skipped during assembly, saving memory and computation.',
  },
  A20: {
    name: 'Double-Layer Boundary Trace',
    math: '{}^t\\tilde{\\Theta}_a (-\\frac{\\tilde{I}}{2} + \\tilde{D}) \\tilde{\\Theta}_s',
    nature: 'Dense (BEM)',
    description: 'Discretization of the boundary integral equation using double-layer operator D on the Lorentz-transformed surface.',
    role: 'Enforces Calderón boundary projector relations for transparent exterior Helmholtz radiation.',
    solver: 'Evaluated across boundary beam elements with 3D cylindrical angle integration.',
  },
  A21: {
    name: 'Boundary-Modal Decoupling',
    math: '0',
    nature: 'Zero Block',
    description: 'Zero block: exterior radiation boundary elements do not directly overlap with the interior engine face.',
    role: 'Physical separation of engine intake face and exterior radiation contour.',
    solver: 'Skipped during assembly.',
  },
  A22: {
    name: 'Single-Layer Boundary Capacity',
    math: '-{}^t\\tilde{\\Theta}_a \\tilde{S} \\tilde{\\Theta}_a',
    nature: 'Dense (BEM)',
    description: 'Single-layer integral operator S on Γ_∞ in Lorentz transformed space.',
    role: 'Weakly singular kernel G(x,y) = e^{ikR}/(4πR) integrated across boundary segments with analytic 1/R regularization.',
    solver: 'Dense symmetric block, factored inside the condensed Schur complement.',
  },
};

export const FemBemMatrixExplorer: React.FC = () => {
  const [activeBlock, setActiveBlock] = useState<BlockKey>('A00');
  const [activeStep, setActiveStep] = useState<number>(1);

  const block = MATRIX_BLOCKS[activeBlock];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 mb-1 flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            Chapter 4.3: Discrete FEM-BEM Coupling & Parallel Schur Solver
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Symmetric Coupled Linear System & MUMPS Parallel Architecture
          </h3>
          <p className="text-sm text-slate-400 mt-0.5">
            Equation (4.143): Symmetrized coupling between volume FEM (<MathView math="P^1" />), duct modes, and boundary BEM (<MathView math="P^0" />).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Matrix Block Grid UI */}
        <div className="lg:col-span-7 p-6 bg-slate-950/70 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Interactive Discrete Block Matrix (Eq 4.143)</span>
              <span>Click any block to inspect</span>
            </div>

            {/* Matrix Visual Layout */}
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto">
              <div className="min-w-[420px] grid grid-cols-3 gap-2.5">
                {(['A00', 'A01', 'A02', 'A10', 'A11', 'A12', 'A20', 'A21', 'A22'] as BlockKey[]).map((key) => {
                  const b = MATRIX_BLOCKS[key];
                  const isSelected = activeBlock === key;
                  const isZero = b.nature === 'Zero Block';

                  return (
                    <button
                      key={key}
                      onClick={() => setActiveBlock(key)}
                      className={`p-3 rounded-lg border text-left transition-all relative flex flex-col justify-between min-h-[92px] ${
                        isSelected
                          ? 'ring-2 ring-cyan-400 border-cyan-400 bg-cyan-950/30'
                          : isZero
                          ? 'bg-slate-900/30 border-slate-800/60 opacity-60 hover:opacity-100'
                          : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-mono text-slate-400 font-bold">{key}</span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            b.nature === 'Sparse (FEM)'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : b.nature === 'Dense (BEM)'
                              ? 'bg-purple-500/20 text-purple-300'
                              : b.nature === 'Modal Matrix'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {b.nature}
                        </span>
                      </div>
                      <div className="my-1.5 text-center text-xs text-white font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                        <MathView math={b.math} />
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {b.name}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Unknowns & RHS Vector preview */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400 px-2">
                <div>
                  Unknown Vector:{' '}
                  <span className="text-cyan-300">
                    <MathView math="[\phi_a(s), \; a_{mn}^-, \; \frac{\partial\phi_a}{\partial n_{A_0}}(a)]^T" />
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Size: 6,000 to 312,000+ DoFs
                </div>
              </div>
            </div>
          </div>

          {/* Schur Complement Solver Flow */}
          <div className="mt-6 p-4 bg-slate-900/80 border border-slate-800 rounded-lg">
            <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 mb-2 flex items-center justify-between">
              <span>Parallel Schur Complement Strategy</span>
              <span className="text-[10px] text-slate-400">CERFACS MUMPS + MPF</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                onClick={() => setActiveStep(1)}
                className={`p-2.5 rounded border text-left transition-all ${
                  activeStep === 1 ? 'bg-cyan-950/40 border-cyan-500/50 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-mono font-bold text-cyan-400 text-[11px] mb-1">Step 1: Sparse Factorization</div>
                <p className="text-[11px] text-slate-300 leading-tight">
                  Invert strictly volume sparse matrix <MathView math="A_{0m}" /> using MUMPS multi-frontal direct solver.
                </p>
              </button>

              <button
                onClick={() => setActiveStep(2)}
                className={`p-2.5 rounded border text-left transition-all ${
                  activeStep === 2 ? 'bg-cyan-950/40 border-cyan-500/50 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-mono font-bold text-cyan-400 text-[11px] mb-1">Step 2: Boundary Condensation</div>
                <p className="text-[11px] text-slate-300 leading-tight">
                  Condense volume DoFs onto modal surface <MathView math="\Gamma_M" /> and BEM boundary <MathView math="\Gamma_\infty" />.
                </p>
              </button>

              <button
                onClick={() => setActiveStep(3)}
                className={`p-2.5 rounded border text-left transition-all ${
                  activeStep === 3 ? 'bg-cyan-950/40 border-cyan-500/50 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-mono font-bold text-cyan-400 text-[11px] mb-1">Step 3: Back-Substitution</div>
                <p className="text-[11px] text-slate-300 leading-tight">
                  Solve small dense Schur system, then back-substitute to recover full interior field <MathView math="\phi_a(s)" />.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Selected Block Details & Mathematical Justifications */}
        <div className="lg:col-span-5 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="border-b border-slate-800 pb-3 mb-3">
              <span className="text-xs font-mono text-cyan-400 uppercase">Selected Matrix Block</span>
              <h4 className="text-lg font-bold text-white tracking-tight mt-0.5">
                {block.name}
              </h4>
              <div className="mt-2 text-cyan-300 font-mono text-sm bg-slate-950/90 p-2.5 rounded border border-slate-800">
                <MathView math={block.math} display={true} />
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950/80 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-mono mb-1">
                  Physical & Mathematical Role
                </span>
                <p className="text-slate-200 leading-relaxed">
                  {block.description}
                </p>
                <p className="text-slate-400 text-[11px] mt-1.5 leading-relaxed">
                  {block.role}
                </p>
              </div>

              <div className="p-3 bg-slate-950/80 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-mono mb-1">
                  Numerical Implementation & Quadrature
                </span>
                <p className="text-cyan-300 text-[11px] leading-relaxed">
                  {block.solver}
                </p>
              </div>

              {/* Hypersingular Operator Variational Note (Eq 3.23) */}
              <div className="p-3 bg-cyan-950/20 border border-cyan-900/40 rounded-lg text-slate-300">
                <span className="text-cyan-300 font-semibold block mb-1">
                  Variational Regularization of Hypersingular N (Eq 3.23):
                </span>
                <p className="text-[11px] leading-relaxed">
                  Because the second normal derivative of the double-layer kernel is non-integrable (<MathView math="\frac{\partial^2 G}{\partial n_x \partial n_y} \sim \frac{1}{R^3}" />), Stefan Duprey regularized it variationally via surface curl:
                </p>
                <div className="mt-1 text-center font-mono text-[10px] text-white">
                  <MathView math="\iint G(x,y) \left[ \vec{\operatorname{rot}}_{\Gamma} p \cdot \vec{\operatorname{rot}}_{\Gamma} p' - k^2 (\vec{n}_x \cdot \vec{n}_y) p p' \right] d\Gamma_x d\Gamma_y" display={true} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  This reduces singularity order from <MathView math="1/R^3" /> to integrable <MathView math="1/R" />, making boundary elements stable and accurate!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
