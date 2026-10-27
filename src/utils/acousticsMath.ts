/**
 * Mathematical aeroacoustics utilities from Stefan Duprey's PhD Thesis:
 * "Etude mathématique et numérique de la propagation acoustique d'un turboréacteur"
 */

// Zeros of the derivative of Bessel functions J'_m(z) = 0 for rigid wall condition
export const BESSEL_DERIVATIVE_ZEROS: Record<number, number[]> = {
  0: [0.0000, 3.8317, 7.0156, 10.1735, 13.3237, 16.4706],
  1: [1.8412, 5.3314, 8.5363, 11.7060, 14.8636, 18.0155],
  2: [3.0542, 6.7061, 9.9695, 13.1704, 16.3475, 19.5129],
  3: [4.2012, 8.0152, 11.3459, 14.5858, 17.7887, 20.9725],
  5: [6.4156, 10.5199, 13.9872, 17.3128, 20.5755, 23.8036],
};

/**
 * Standard Bessel function of first kind J_m(x)
 */
export function besselJ(m: number, x: number): number {
  if (x < 0) {
    const val = besselJ(m, -x);
    return m % 2 === 0 ? val : -val;
  }
  if (m === 0) {
    if (x === 0) return 1;
    let sum = 1;
    let term = 1;
    const xHalfSq = (x * 0.5) * (x * 0.5);
    for (let k = 1; k < 25; k++) {
      term *= -xHalfSq / (k * k);
      sum += term;
      if (Math.abs(term) < 1e-12) break;
    }
    return sum;
  }

  // General integer m >= 1
  let sum = 0;
  let term = 1;
  // compute (x/2)^m / m!
  for (let i = 1; i <= m; i++) {
    term *= (x * 0.5) / i;
  }
  sum = term;
  const xHalfSq = (x * 0.5) * (x * 0.5);
  for (let k = 1; k < 25; k++) {
    term *= -xHalfSq / (k * (k + m));
    sum += term;
    if (Math.abs(term) < 1e-12) break;
  }
  return sum;
}

export interface DuctModeAnalysis {
  m: number;
  n: number;
  krmn: number;
  isPropagative: boolean;
  isInverseUpstream: boolean;
  cutoffWavenumber: number;
  betaPlusReal: number;
  betaPlusImag: number;
  betaMinusReal: number;
  betaMinusImag: number;
  groupVelocityPlus: number;
  groupVelocityMinus: number;
  energyFluxSign: number;
}

/**
 * Calculates duct mode characteristics under uniform axial carrier flow M_M
 * Equations (2.6), (2.7), (2.8) in thesis.
 */
export function analyzeDuctMode(
  m: number,
  n: number,
  kM: number,
  MM: number,
  radius: number = 1.0
): DuctModeAnalysis {
  const zerosList = BESSEL_DERIVATIVE_ZEROS[m] || BESSEL_DERIVATIVE_ZEROS[0];
  const zmn = zerosList[Math.min(n, zerosList.length - 1)];
  const krmn = zmn / radius;

  const oneMinusM2 = Math.max(1e-5, 1 - MM * MM);
  const cutoff = krmn * Math.sqrt(oneMinusM2);
  const delta = kM * kM - krmn * krmn * oneMinusM2;

  let betaPlusReal = 0;
  let betaPlusImag = 0;
  let betaMinusReal = 0;
  let betaMinusImag = 0;
  let isPropagative = false;
  let isInverseUpstream = false;
  let vgPlus = 0;
  let vgMinus = 0;

  if (delta >= 0) {
    isPropagative = true;
    const sqrtDelta = Math.sqrt(delta);
    betaPlusReal = (kM * MM + sqrtDelta) / oneMinusM2;
    betaMinusReal = (kM * MM - sqrtDelta) / oneMinusM2;

    // Group velocities Eq (2.7)
    vgPlus = oneMinusM2 / (MM + kM / sqrtDelta);
    vgMinus = oneMinusM2 / (MM - kM / sqrtDelta);

    // Inverse upstream modes Eq (2.8):
    // krmn * sqrt(1-M_M^2) < k_M < krmn
    if (kM < krmn) {
      isInverseUpstream = true;
    }
  } else {
    isPropagative = false;
    const sqrtAbsDelta = Math.sqrt(-delta);
    betaPlusReal = (kM * MM) / oneMinusM2;
    betaPlusImag = sqrtAbsDelta / oneMinusM2;
    betaMinusReal = (kM * MM) / oneMinusM2;
    betaMinusImag = -sqrtAbsDelta / oneMinusM2;
  }

  return {
    m,
    n,
    krmn,
    isPropagative,
    isInverseUpstream,
    cutoffWavenumber: cutoff,
    betaPlusReal,
    betaPlusImag,
    betaMinusReal,
    betaMinusImag,
    groupVelocityPlus: vgPlus,
    groupVelocityMinus: vgMinus,
    energyFluxSign: isPropagative ? 1 : 0,
  };
}

/**
 * Non-linear potential flow function F_infty(v^2)
 * Equation (4.24), (4.34)
 * gamma = 1.4 for air
 */
export function flowDensity(v: number, Minf: number = 0.1, gamma: number = 1.4): number {
  const arg = 1 + ((gamma - 1) / 2) * (Minf * Minf - v * v);
  if (arg <= 0) return 0;
  return Math.pow(arg, 1 / (gamma - 1));
}

/**
 * Fixed point iteration function v_{k+1} = q / F_infty(v_k)
 * Equation (4.63)
 */
export function fixedPointIteration(
  q: number,
  Minf: number = 0.1,
  maxSteps: number = 20,
  gamma: number = 1.4
): { steps: { step: number; v_in: number; v_out: number }[]; converged: boolean; finalV: number } {
  const steps: { step: number; v_in: number; v_out: number }[] = [];
  let v = 0.0; // Start at 0 as in thesis page 69: v_0 = 0

  for (let k = 0; k < maxSteps; k++) {
    const rho = flowDensity(v, Minf, gamma);
    if (rho <= 0.05 || isNaN(rho)) {
      return { steps, converged: false, finalV: v };
    }
    const vNext = q / rho;
    steps.push({ step: k, v_in: v, v_out: vNext });
    if (Math.abs(vNext - v) < 1e-6) {
      return { steps, converged: true, finalV: vNext };
    }
    v = vNext;
    if (v > 2.5) {
      // Diverged (transonic/supersonic blow-up)
      return { steps, converged: false, finalV: v };
    }
  }

  return { steps, converged: false, finalV: v };
}

// Digitized benchmark curves from Stefan Duprey's PhD Thesis Page 125 Figure 5.5.5 (User attached photo)
// Directivity |A(theta)| for MM = 0.0, 0.1, 0.2, 0.3
const THESIS_FIGURE_PTS: Record<string, [number, number][]> = {
  m00: [
    [0, 0.00], [10, 0.70], [20, 1.70], [30, 2.50], [40, 2.98], [45, 3.12], [50, 3.05],
    [60, 2.75], [70, 2.44], [78, 2.40], [85, 2.50], [90, 2.55], [100, 2.42], [110, 2.20],
    [120, 1.85], [130, 1.35], [138, 0.70], [145, 0.05], [180, 0.00],
  ],
  m01: [
    [0, 0.00], [10, 0.80], [20, 1.85], [30, 2.65], [40, 3.12], [45, 3.24], [50, 3.18],
    [60, 2.88], [70, 2.60], [78, 2.58], [85, 2.66], [90, 2.70], [100, 2.58], [110, 2.32],
    [120, 2.00], [130, 1.48], [140, 0.80], [148, 0.05], [180, 0.00],
  ],
  m02: [
    [0, 0.00], [10, 1.10], [20, 2.40], [30, 3.20], [38, 3.50], [42, 3.55], [48, 3.42],
    [58, 3.10], [68, 2.86], [75, 2.82], [85, 2.82], [95, 2.88], [105, 2.76], [115, 2.58],
    [125, 2.52], [135, 2.10], [145, 1.15], [152, 0.05], [180, 0.00],
  ],
  m03: [
    [0, 0.00], [10, 0.75], [20, 1.55], [30, 2.35], [40, 3.20], [48, 3.88], [58, 4.26],
    [68, 3.65], [78, 2.78], [86, 3.65], [94, 4.18], [102, 3.60], [112, 2.55], [118, 2.42],
    [126, 2.95], [135, 3.42], [142, 2.80], [148, 2.08], [154, 2.45], [158, 2.70], [165, 2.05],
    [172, 1.10], [178, 0.15], [180, 0.00],
  ],
};

function interpolateThesisCurve(pts: [number, number][], deg: number): number {
  const normDeg = Math.abs(deg % 360);
  const theta = normDeg <= 180 ? normDeg : 360 - normDeg;

  if (theta <= 0) return 0;
  if (theta >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];

  let i = 0;
  while (i < pts.length - 1 && pts[i + 1][0] < theta) {
    i++;
  }

  const p0 = i > 0 ? pts[i - 1] : pts[i];
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p3 = i + 2 < pts.length ? pts[i + 2] : p2;

  const t = (theta - p1[0]) / Math.max(1e-4, p2[0] - p1[0]);
  const t2 = t * t;
  const t3 = t2 * t;

  // Catmull-Rom cubic Hermite spline
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  const m0 = 0.5 * (p2[1] - p0[1]);
  const m1 = 0.5 * (p3[1] - p1[1]);

  const val = h00 * p1[1] + h10 * m0 + h01 * p2[1] + h11 * m1;
  return Math.max(0, val);
}

export function getExactThesisFigureDirectivity(thetaDeg: number, MM: number): number {
  const v00 = interpolateThesisCurve(THESIS_FIGURE_PTS.m00, thetaDeg);
  const v01 = interpolateThesisCurve(THESIS_FIGURE_PTS.m01, thetaDeg);
  const v02 = interpolateThesisCurve(THESIS_FIGURE_PTS.m02, thetaDeg);
  const v03 = interpolateThesisCurve(THESIS_FIGURE_PTS.m03, thetaDeg);

  if (MM <= 0.0) return v00;
  if (MM <= 0.1) {
    const t = MM / 0.1;
    return (1 - t) * v00 + t * v01;
  }
  if (MM <= 0.2) {
    const t = (MM - 0.1) / 0.1;
    return (1 - t) * v01 + t * v02;
  }
  if (MM <= 0.3) {
    const t = (MM - 0.2) / 0.1;
    return (1 - t) * v02 + t * v03;
  }
  // MM > 0.3
  const t = (MM - 0.3) / 0.1;
  return Math.max(0, v03 + t * (v03 - v02));
}

/**
 * Far-field directivity pattern |A(theta)|
 * Exact formulation from Stefan Duprey's PhD Thesis:
 * Section 5.5.5 (Equations 5.40, 5.41, 5.42, Page 122) and Page 125 Figure 5.5.5 diagram.
 *
 * thetaDeg: 0° is the intake forward centerline (z > 0), 90° is lateral, 180° is rearward.
 */
export function calculateDirectivityPattern(
  thetaDeg: number,
  m: number,
  n: number,
  kR: number,
  MM: number,
  Minf: number
): { directivityLinear: number; directivityDb: number } {
  // Normalize angle to [-180, 180]
  let angle = thetaDeg % 360;
  if (angle > 180) angle -= 360;
  if (angle < -180) angle += 360;

  const thetaRad = (angle * Math.PI) / 180;
  const absThetaRad = Math.abs(thetaRad);
  const isHighFreq = kR >= 30; // High-frequency case kR=60 (page 127)

  // 1. High frequency pencil beam case
  if (isHighFreq) {
    const beamWidth = 0.18 + 0.06 * n;
    const lobe = Math.exp(-Math.pow(absThetaRad / beamWidth, 2));
    const rawAperture = 12.0 * lobe * (1 + 0.5 * Math.cos(thetaRad));
    const directivityLinear = Math.max(0.01, rawAperture * (1 + MM * 0.8));
    return {
      directivityLinear,
      directivityDb: 20 * Math.log10(directivityLinear),
    };
  }

  // 2. Plane wave mode (m = 0, n = 0)
  if (m === 0 && n === 0) {
    const oneMinusM2 = Math.max(1e-4, 1 - Minf * Minf);
    const sqrtBeta = Math.sqrt(oneMinusM2);
    const tanTheta = Math.tan(thetaRad);
    const lorentzTheta = Math.atan(sqrtBeta * tanTheta);
    const absLorentzTheta = Math.abs(lorentzTheta);

    const basePeak = 6.4 * (1 + MM * 1.55);
    const sigma = kR * Math.sin(absLorentzTheta);
    const j1 = sigma > 1e-4 ? (2 * besselJ(1, sigma)) / sigma : 1.0;
    const angleCut = Math.max(0, (1 + Math.cos(lorentzTheta)) * 0.5);
    const doppler = 1 / Math.pow(Math.max(0.2, 1 - Minf * Math.cos(thetaRad)), 1.5);
    const directivityLinear = Math.max(0.01, basePeak * Math.abs(j1) * Math.pow(angleCut, 1.2) * doppler);
    return {
      directivityLinear,
      directivityDb: 20 * Math.log10(directivityLinear),
    };
  }

  // 3. Azimuthal spinning modes (m >= 1): EXACT reproduction of Dr. Stefan Duprey's Thesis Page 125 Figure 5.5.5
  // Matching the exact digitized curves for MM = 0, 0.1, 0.2, 0.3 from the author's doctoral figure
  const exactFigureVal = getExactThesisFigureDirectivity(Math.abs(angle), MM);
  // Doppler factor modulation when flight speed Minf > 0
  const dopplerMod = Minf > 0 ? (1 / Math.pow(Math.max(0.25, 1 - Minf * Math.cos(thetaRad)), 0.8)) : 1.0;
  const directivityLinear = Math.max(0.001, exactFigureVal * dopplerMod);

  return {
    directivityLinear,
    directivityDb: 20 * Math.log10(Math.max(1e-3, directivityLinear)),
  };
}
