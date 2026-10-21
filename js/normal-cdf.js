/* Normal probabilities.
   CDF: Abramowitz and Stegun 7.1.26 rational approximation to erf.
   Inverse: Acklam / Beasley-Springer-Moro rational approximation.
   No libraries. The numerical routines match the previous in-page implementation. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NormalCdf = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MINUS = "\u2212";
  var TIMES = "\u00d7";
  var APPROX = "\u2248";
  var PHI = "\u03a6";
  var MU = "\u03bc";
  var SIGMA = "\u03c3";
  var INV = "\u207b\u00b9";
  var CDF_NOTE = "CDF via the Abramowitz and Stegun erf approximation (formula 7.1.26). Absolute error is typically under about 1.5" + TIMES + "10" + "\u207b\u2077" + ".";
  var INV_NOTE = "Inverse CDF uses a rational approximation in the style of Acklam and Beasley Springer.";

  /* Normal CDF via Abramowitz & Stegun 7.1.26 rational approximation to erf */
  function erfApprox(x) {
    var sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    var a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    var a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    var t = 1 / (1 + p * x);
    var y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  function normalCdf(z) {
    return 0.5 * (1 + erfApprox(z / Math.SQRT2));
  }

  /* Inverse normal CDF via Beasley-Springer/Moro-style rational approximation */
  function invNormalCdf(p) {
    if (!(p > 0 && p < 1)) throw new Error("Percentile / probability must be strictly between 0 and 1.");
    if (p === 0.5) return 0;
    var a = [
      -3.969683028665376e+01,
      2.209460984245205e+02,
      -2.759285104469687e+02,
      1.383577459334152e+02,
      -3.066479806614716e+01,
      2.506628277459239e+00
    ];
    var b = [
      -5.447609879822406e+01,
      1.615858368580409e+02,
      -1.556989798598866e+02,
      6.680131188771972e+01,
      -1.328068155288572e+01
    ];
    var c = [
      -7.784894002430293e-03,
      -3.223964580411365e-01,
      -2.400758277161838e+00,
      -2.549732539343734e+00,
      4.374664141464968e+00,
      2.938163982698783e+00
    ];
    var d = [
      7.784695709041462e-03,
      3.224671290700398e-01,
      2.445134137142996e+00,
      3.754408661907416e+00
    ];
    var plow = 0.02425;
    var phigh = 1 - plow;
    var q, r;
    if (p < plow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (p > phigh) {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  function formatNum(n) {
    if (typeof n !== "number" || !isFinite(n)) return String(n);
    var a = Math.abs(n);
    var s;
    if (a !== 0 && (a < 1e-4 || a >= 1e6)) s = n.toExponential(6);
    else s = (Math.round(n * 1e10) / 1e10).toString();
    return s.replace(/-/g, MINUS);
  }

  function displayedExact(n) {
    if (typeof n !== "number" || !isFinite(n)) return false;
    var a = Math.abs(n);
    if (a !== 0 && (a < 1e-4 || a >= 1e6)) return false;
    return n === Math.round(n * 1e10) / 1e10;
  }

  function rel(n) {
    return displayedExact(n) ? "=" : APPROX;
  }

  function reqNum(value, label) {
    var v;
    if (typeof value === "number") v = value;
    else if (typeof value === "string") {
      var trimmed = value.trim();
      if (!trimmed) throw new Error("Enter a valid number for " + label + ".");
      v = parseFloat(trimmed);
    } else {
      throw new Error("Enter a valid number for " + label + ".");
    }
    if (!isFinite(v)) throw new Error("Enter a valid number for " + label + ".");
    return v;
  }

  function readSigma(value) {
    var sigma = reqNum(value, "the standard deviation");
    if (!(sigma > 0)) throw new Error("Standard deviation must be greater than 0.");
    return sigma;
  }

  function standardize(x, mu, sigma) {
    var z = (x - mu) / sigma;
    if (!isFinite(z)) {
      throw new Error("The standardized score is too large to compute. Check the bounds and the standard deviation.");
    }
    return z;
  }

  function clampProb(p) {
    if (p < 0 && p > -1e-6) return 0;
    if (p > 1 && p < 1 + 1e-6) return 1;
    if (!(p >= 0 && p <= 1) || !isFinite(p)) {
      throw new Error("The probability could not be computed from these inputs.");
    }
    return p;
  }

  function percentClause(p) {
    if (p === 0) return "0%";
    if (p === 1) return "100%";
    var pct = p * 100;
    if (pct < 0.005) return "under 0.01%";
    if (pct > 99.995) return "over 99.99%";
    var s = (Math.round(pct * 100) / 100).toFixed(2);
    if (s.endsWith(".00")) s = s.slice(0, -3);
    return "about " + s + "%";
  }

  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function phiTerm(z) {
    return PHI + "(" + formatNum(z) + ")";
  }

  function finish(amount, lines, extra) {
    var out = {
      amount: amount,
      detail: lines.join("\n"),
      probability: null,
      z: null,
      za: null,
      zb: null,
      x: null,
      mu: null,
      sigma: null,
      p: null
    };
    if (extra) {
      var keys = Object.keys(extra);
      for (var i = 0; i < keys.length; i++) out[keys[i]] = extra[keys[i]];
    }
    return out;
  }

  function solveStandard(input) {
    var z = reqNum(input.z, "the z score");
    var prob = clampProb(normalCdf(z));
    var lines = [];
    lines.push("Standard normal: mean 0 and standard deviation 1.");
    lines.push(phiTerm(z) + " = P(Z " + "\u2264" + " " + formatNum(z) + ") " + rel(prob) + " " + formatNum(prob) + ".");
    lines.push(cap(percentClause(prob)) + " of the standard normal falls at or below " + formatNum(z) + ".");
    lines.push("This is the left tail. The right tail is " + percentClause(1 - prob) + ".");
    lines.push(CDF_NOTE);
    lines.push("Educational use only.");
    return finish(
      phiTerm(z) + " " + rel(prob) + " " + formatNum(prob),
      lines,
      { probability: prob, z: z, mu: 0, sigma: 1 }
    );
  }

  function readPercent(raw) {
    var entered = reqNum(raw, "the percentile");
    var p = entered > 1 ? entered / 100 : entered;
    if (!(p > 0 && p < 1)) {
      throw new Error("Enter a percentile in (0, 100) or a probability in (0, 1).");
    }
    return { entered: entered, p: p, asPercent: entered > 1 };
  }

  function solveInverse(input) {
    var parsed = readPercent(input.p);
    var mu = reqNum(input.mu, "the mean");
    var sigma = readSigma(input.sigma);
    var z = invNormalCdf(parsed.p);
    if (!isFinite(z)) throw new Error("The cutoff could not be computed from this percentile.");
    var x = mu + z * sigma;
    if (!isFinite(x)) {
      throw new Error("The raw score is too large to compute. Check the mean and the standard deviation.");
    }
    var lines = [];
    if (parsed.asPercent) {
      lines.push("Entered " + formatNum(parsed.entered) + ", read as a percentage, so the left tail probability is p = " + formatNum(parsed.p) + ".");
    } else {
      lines.push("Entered " + formatNum(parsed.entered) + ", already a probability, so p = " + formatNum(parsed.p) + ".");
    }
    lines.push("z = " + PHI + INV + "(p) " + rel(z) + " " + formatNum(z) + ".");
    lines.push("x = " + MU + " + z" + SIGMA + " = " + formatNum(mu) + " + " + formatNum(z) + " " + TIMES + " " + formatNum(sigma) + " " + rel(x) + " " + formatNum(x) + ".");
    if (mu === 0 && sigma === 1) {
      lines.push(cap(percentClause(parsed.p)) + " of the standard normal falls at or below this z score.");
    } else {
      lines.push(cap(percentClause(parsed.p)) + " of a normal model with mean " + formatNum(mu) + " and standard deviation " + formatNum(sigma) + " falls at or below this score.");
    }
    lines.push(INV_NOTE);
    lines.push("Educational use only.");
    var headline = (mu === 0 && sigma === 1)
      ? "z " + rel(z) + " " + formatNum(z)
      : "x " + rel(x) + " " + formatNum(x);
    return finish(headline, lines, {
      probability: parsed.p,
      p: parsed.p,
      z: z,
      x: x,
      mu: mu,
      sigma: sigma
    });
  }

  function zLine(label, x, mu, sigma, z) {
    return label + "z = (" + formatNum(x) + " " + MINUS + " " + formatNum(mu) + ") / " + formatNum(sigma) + " " + rel(z) + " " + formatNum(z) + ".";
  }

  function solveScore(input) {
    var mu = reqNum(input.mu, "the mean");
    var sigma = readSigma(input.sigma);
    var range = String(input.range || "").trim();
    if (range !== "lt" && range !== "gt" && range !== "between") {
      throw new Error("Choose a left tail, a right tail, or the probability between two values.");
    }
    var lines = [];
    lines.push("Mean " + MU + " = " + formatNum(mu) + " and standard deviation " + SIGMA + " = " + formatNum(sigma) + ".");
    lines.push("Standardize with z = (x " + MINUS + " " + MU + ") / " + SIGMA + ".");
    var prob, za, zb, a, b, amount;
    if (range === "between") {
      a = reqNum(input.a, "the lower bound a");
      b = reqNum(input.b, "the upper bound b");
      if (a > b) throw new Error("The lower bound a must be less than the upper bound b.");
      za = standardize(a, mu, sigma);
      zb = standardize(b, mu, sigma);
      prob = clampProb(normalCdf(zb) - normalCdf(za));
      lines.push(zLine("Lower bound: ", a, mu, sigma, za));
      lines.push(zLine("Upper bound: ", b, mu, sigma, zb));
      lines.push("P(" + formatNum(a) + " < X < " + formatNum(b) + ") = " + phiTerm(zb) + " " + MINUS + " " + phiTerm(za) + " " + rel(prob) + " " + formatNum(prob) + ".");
      if (a === b) {
        lines.push("The two bounds are the same score, so the probability is 0.");
      } else {
        lines.push(cap(percentClause(prob)) + " of this model falls between " + formatNum(a) + " and " + formatNum(b) + ".");
      }
      amount = "P(" + formatNum(a) + " < X < " + formatNum(b) + ") " + rel(prob) + " " + formatNum(prob);
    } else if (range === "lt") {
      b = reqNum(input.b, "the upper bound b");
      zb = standardize(b, mu, sigma);
      prob = clampProb(normalCdf(zb));
      lines.push(zLine("", b, mu, sigma, zb));
      lines.push("P(X < " + formatNum(b) + ") = " + phiTerm(zb) + " " + rel(prob) + " " + formatNum(prob) + ".");
      lines.push(cap(percentClause(prob)) + " of this model falls below " + formatNum(b) + ". " + cap(percentClause(1 - prob)) + " falls above " + formatNum(b) + ".");
      amount = "P(X < " + formatNum(b) + ") " + rel(prob) + " " + formatNum(prob);
      a = null;
      za = null;
    } else {
      a = reqNum(input.a, "the lower bound a");
      za = standardize(a, mu, sigma);
      prob = clampProb(1 - normalCdf(za));
      lines.push(zLine("", a, mu, sigma, za));
      lines.push("P(X > " + formatNum(a) + ") = 1 " + MINUS + " " + phiTerm(za) + " " + rel(prob) + " " + formatNum(prob) + ".");
      lines.push(cap(percentClause(prob)) + " of this model falls above " + formatNum(a) + ". " + cap(percentClause(1 - prob)) + " falls below " + formatNum(a) + ".");
      amount = "P(X > " + formatNum(a) + ") " + rel(prob) + " " + formatNum(prob);
      b = null;
      zb = null;
    }
    lines.push("On a continuous normal curve, one exact score has probability 0, so including an endpoint does not change this value.");
    lines.push(CDF_NOTE);
    lines.push("Educational use only.");
    return finish(amount, lines, {
      probability: prob,
      mu: mu,
      sigma: sigma,
      za: za,
      zb: zb,
      a: a,
      b: b
    });
  }

  function solve(input) {
    var src = input || {};
    var mode = String(src.mode || "score");
    if (mode === "cdf" || mode === "z") return solveStandard(src);
    if (mode === "inv" || mode === "inverse") return solveInverse(src);
    if (mode === "score" || mode === "raw") return solveScore(src);
    throw new Error("Choose a mode.");
  }

  return {
    normalCdf: normalCdf,
    invNormalCdf: invNormalCdf,
    formatNum: formatNum,
    solve: solve
  };
});
