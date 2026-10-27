import React, { useState } from 'react';
import { BookMarked, Copy, Check, Search, ArrowUpRight, Binary, Code2 } from 'lucide-react';
import { MathView } from './MathView';

interface FormulaCard {
  id: string;
  title: string;
  category: 'Lorentz & Wave Physics' | 'Calderón Operators' | 'Potential Flow' | 'Axial Singularity' | 'Asymptotic Directivity';
  latex: string;
  thesisRef: string;
  description: string;
  significance: string;
}

const FORMULAS: FormulaCard[] = [
  {
    id: 'lorentz-transform',
    title: 'Lorentz Space-Time & Frequency Diffeomorphism',
    category: 'Lorentz & Wave Physics',
    latex: "z' = \\frac{z}{\\sqrt{1-M_\\infty^2}}, \\quad \\tilde{\\phi}_a'(x',y',z') = \\tilde{\\phi}_a(x',y',z') e^{-i \\frac{k_\\infty M_\\infty}{\\sqrt{1-M_\\infty^2}} z'} \\implies \\Delta' \\tilde{\\phi}_a' + \\left(\\frac{k_\\infty}{\\sqrt{1-M_\\infty^2}}\\right)^2 \\tilde{\\phi}_a' = 0",
    thesisRef: 'Equations (3.3), (3.7), (3.8) — Page 30-31',
    description: 'Maps the convected wave PDE in uniform exterior carrier flow to standard Helmholtz with a Doppler phase dilation factor.',
    significance: 'Enables the use of the classical free-space Helmholtz Green kernel G(x,y) = e^{ikR}/(4πR) in the exterior domain, avoiding convective green tensor singularities.',
  },
  {
    id: 'duct-dispersion',
    title: 'Convected Duct Dispersion & Inverse Upstream Modes',
    category: 'Lorentz & Wave Physics',
    latex: "\\beta_{mn}^\\pm = \\frac{k_M M_M \\pm \\sqrt{k_M^2 - k_{rmn}^2(1-M_M^2)}}{1 - M_M^2}, \\quad v_g^\\pm = \\frac{1 - M_M^2}{M_M \\pm \\frac{k_M}{\\sqrt{k_M^2 - k_{rmn}^2(1-M_M^2)}}}",
    thesisRef: 'Equations (2.6), (2.7), (2.8) — Page 21',
    description: 'Calculates the axial wavenumbers β_mn^± and group velocities for Bessel waveguide modes under uniform intake flow M_M.',
    significance: 'Reveals the phenomenon of "inverse upstream modes" when √(1-M_M²) k_rmn < k_M < k_rmn: positive phase velocity but negative energy group velocity!',
  },
  {
    id: 'energy-flux',
    title: 'Unit Acoustic Energy Flux Normalization',
    category: 'Lorentz & Wave Physics',
    latex: "\\frac{1}{T}\\int_0^T \\left\\langle \\vec{I}(a_{mn}^\\pm \\Xi_{mn}^{\\text{renorm}\\pm}) \\cdot \\vec{n} \\right\\rangle dt = \\pm |a_{mn}^\\pm|^2, \\quad \\vec{I} = W_a \\vec{v}_M + p_a \\vec{v}_a",
    thesisRef: 'Equations (2.11), (2.18) — Page 22-23',
    description: 'Renormalizes duct eigenmodes so each mode carries exactly ±1 unit of convected acoustic energy flux in the direction of propagation.',
    significance: 'Gives direct physical meaning to modal reflection coefficients and allows intuitive dB scaling for noise certification.',
  },
  {
    id: 'hypersingular-regularization',
    title: 'Variational Regularization of Hypersingular Calderón Operator N',
    category: 'Calderón Operators',
    latex: "\\langle -N(p), p' \\rangle = \\iint_{\\Gamma \\times \\Gamma} G(x, y) \\left[ \\vec{\\operatorname{rot}}_\\Gamma p(y) \\cdot \\vec{\\operatorname{rot}}_\\Gamma p'(x) - k^2 (\\vec{n}_x \\cdot \\vec{n}_y) p(y) p'(x) \\right] d\\Gamma_x d\\Gamma_y",
    thesisRef: 'Equation (3.23) — Page 35',
    description: 'Weak-form regularization of the non-integrable 1/R³ double-layer normal derivative kernel using surface rotationals.',
    significance: 'Transforms an otherwise non-integrable boundary operator into an H^{1/2}(Γ) -> H^{-1/2}(Γ) isomorphism, guaranteeing stability in BEM discretization.',
  },
  {
    id: 'calderon-projectors',
    title: 'Calderón Boundary Projector System',
    category: 'Calderón Operators',
    latex: "\\begin{pmatrix} -N & \\frac{I}{2} + D^* \\\\ \\frac{I}{2} - D & S \\end{pmatrix} \\begin{pmatrix} \\Phi \\\\ q \\end{pmatrix} = \\begin{pmatrix} \\left.\\frac{\\partial p}{\\partial n}\\right|_{\\text{int}} \\\\ \\left.p\\right|_{\\text{int}} \\end{pmatrix}",
    thesisRef: 'Equation (3.22) — Page 35',
    description: 'Complete boundary relationship for acoustic pressure and normal derivative on closed surface Γ.',
    significance: 'Forms the exterior BEM half of the symmetric FEM-BEM coupling on the radiation boundary Γ_∞.',
  },
  {
    id: 'potential-flow-pde',
    title: 'Non-Linear Compressible Potential Flow Equation',
    category: 'Potential Flow',
    latex: "\\operatorname{div}\\left(F_\\infty(|\\vec{\\nabla}\\phi_0|^2) \\vec{\\nabla}\\phi_0\\right) = 0, \\quad F_\\infty(x) = \\left(\\frac{\\rho_\\infty^\\gamma}{\\gamma p_\\infty}\\right)^{\\frac{1}{\\gamma-1}} \\left[ a_\\infty^2 + \\frac{\\gamma-1}{2}(v_\\infty^2 - x) \\right]^{\\frac{1}{\\gamma-1}}",
    thesisRef: 'Equations (4.24), (4.25) — Page 57',
    description: 'Governing stationary equation for the compressible, isentropic, irrotational carrier fluid flow around the nacelle.',
    significance: 'Captures the local density and sound speed variations across the nacelle lip without the massive computational expense of full Navier-Stokes.',
  },
  {
    id: 'necas-fixed-point',
    title: 'Nečas Coercivity & Fixed-Point Convergence',
    category: 'Potential Flow',
    latex: "\\exists \\alpha > 0, \\quad \\langle \\vec{\\nabla}K(\\phi) - \\vec{\\nabla}K(\\psi), \\phi - \\psi \\rangle \\ge \\alpha \\|\\phi - \\psi\\|_{H^1(\\Omega)/\\mathbb{R}}^2, \\quad v_{k+1} = \\frac{q}{F_\\infty(v_k)}",
    thesisRef: 'Theorem 4.2.3 & Proposition 2 — Page 62-64',
    description: 'Proof of strict ellipticity, coercivity, and strong convergence of the fixed-point sequence in the Sobolev quotient space.',
    significance: 'Proves unconditional existence and uniqueness of the subsonic carrier flow solution without requiring artificial damping.',
  },
  {
    id: 'natural-weighted-element',
    title: 'Natural Weighted Sobolev Element for Axial Singularity',
    category: 'Axial Singularity',
    latex: "\\tilde{u}_T(r, z) = \\tilde{\\alpha}\\sqrt{r} + \\tilde{\\beta}r\\sqrt{r} + \\tilde{\\gamma}\\sqrt{r}z \\in X_T = \\left\\{ u \\in C^0(\\bar{\\Omega}), \\; u\\sqrt{r}|_K \\in P^1 \\right\\} \\subset H_{0,a}^1(\\Omega)",
    thesisRef: 'Equations (5.10), (5.11) — Page 99',
    description: 'New finite element approximation tailored to the weighted Sobolev space H_a^1(Ω) in cylindrical coordinates.',
    significance: 'Replaces artificial zero Dirichlet conditions on the axis with dedicated natural degrees of freedom, completely eradicating axis distortion artifacts.',
  },
  {
    id: 'far-field-directivity',
    title: 'Asymptotic Far-Field Acoustic Directivity Representation',
    category: 'Asymptotic Directivity',
    latex: "\\phi_a(r, \\theta) \\approx \\frac{e^{i \\frac{k_\\infty}{\\sqrt{1-M_\\infty^2}} r}}{4\\pi r} A(\\theta), \\quad A(\\theta) = e^{i \\frac{k_\\infty M_\\infty}{\\sqrt{1-M_\\infty^2}}\\cos(\\theta')} \\tilde{A}'(\\theta')",
    thesisRef: 'Equations (5.40), (5.41), (5.42) — Page 122',
    description: 'Asymptotic expansion of the boundary integral formula in the Lorentz frame mapped back into physical space.',
    significance: 'Gives the direct analytical formula for the acoustic directivity pattern used to evaluate the 5+ dB impact on community takeoff noise.',
  },
];

export const MathFormulaeLibrary: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ['All', 'Lorentz & Wave Physics', 'Calderón Operators', 'Potential Flow', 'Axial Singularity', 'Asymptotic Directivity'];

  const filteredFormulas = FORMULAS.filter((f) => {
    const matchesCat = selectedCategory === 'All' || f.category === selectedCategory;
    const matchesSearch =
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.thesisRef.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCopy = (latex: string, id: string) => {
    navigator.clipboard.writeText(latex);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 mb-1 flex items-center gap-2">
            <BookMarked className="w-3.5 h-3.5 text-cyan-400" />
            Theoretical Compendium & Formula Archive
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Key Mathematical Formulations of Dr. Stefan Duprey's Thesis
          </h3>
          <p className="text-sm text-slate-400 mt-0.5">
            Interactive mathematical compendium rendered in KaTeX with exact thesis references and physical derivations.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search equations, theorems..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 text-xs font-mono rounded-md whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Formula Cards Grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFormulas.map((f) => (
          <div
            key={f.id}
            className="p-5 bg-slate-950/70 border border-slate-800 rounded-lg hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block">
                    {f.category}
                  </span>
                  <h4 className="text-sm font-bold text-white tracking-tight mt-0.5">
                    {f.title}
                  </h4>
                </div>
                <button
                  onClick={() => handleCopy(f.latex, f.id)}
                  className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-300 transition-colors shrink-0"
                  title="Copy LaTeX source"
                >
                  {copiedId === f.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Formula Display Box */}
              <div className="p-3.5 bg-slate-900/90 rounded border border-slate-800/80 text-cyan-300 overflow-x-auto">
                <MathView math={f.latex} display={true} />
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {f.description}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2 text-[11px]">
              <div className="text-slate-400">
                <strong className="text-slate-200">Significance:</strong> {f.significance}
              </div>
              <div className="text-cyan-400 font-mono text-[10px]">
                {f.thesisRef}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
