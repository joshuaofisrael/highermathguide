/* Integrating factor for y' + P(x) y = Q(x).
   P is a polynomial. Q is a polynomial, a polynomial times an exponential,
   or a polynomial times A sin(bx) + B cos(bx). Rational arithmetic, no libraries.
   If the integral of mu Q is not in that class, the page refuses a formula
   and, when an initial condition is present, returns a Runge-Kutta table. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FirstOrderLinearOde = api;
  if (typeof document !== "undefined") api.boot();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MINUS = "\u2212";
  var MAX_DEGREE = 6;

  function gcd(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b !== 0n) {
      var t = a % b;
      a = b;
      b = t;
    }
    return a === 0n ? 1n : a;
  }

  function rat(n, d) {
    if (typeof n !== "bigint" || typeof d !== "bigint") {
      throw new Error("Internal arithmetic expected integers.");
    }
    if (d === 0n) throw new Error("Division by zero.");
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    var g = gcd(n, d);
    return { n: n / g, d: d / g };
  }

  function add(a, b) { return rat(a.n * b.d + b.n * a.d, a.d * b.d); }
  function sub(a, b) { return rat(a.n * b.d - b.n * a.d, a.d * b.d); }
  function mul(a, b) { return rat(a.n * b.n, a.d * b.d); }
  function div(a, b) {
    if (b.n === 0n) throw new Error("Division by zero.");
    return rat(a.n * b.d, a.d * b.n);
  }
  function neg(a) { return rat(-a.n, a.d); }
  function isZero(a) { return a.n === 0n; }
  function eq(a, b) { return a.n === b.n && a.d === b.d; }
  function absRat(a) { return a.n < 0n ? neg(a) : a; }

  var ZERO = rat(0n, 1n);
  var ONE = rat(1n, 1n);
  var NEG_ONE = rat(-1n, 1n);

  function fmtRat(a) {
    var sign = a.n < 0n ? MINUS : "";
    var n = a.n < 0n ? -a.n : a.n;
    if (a.d === 1n) return sign + n.toString();
    return sign + n.toString() + "/" + a.d.toString();
  }

  function ratToNumber(q) {
    return Number(q.n) / Number(q.d);
  }

  function parseEntry(raw, label) {
    var where = label ? " for " + label : "";
    var s = String(raw == null ? "" : raw).trim().replace(/\s+/g, "");
    s = s.replace(/[\u2212\u2013\u2014]/g, "-");
    if (!s) throw new Error("Enter an integer, a decimal, or a fraction such as 3/4" + where + ".");
    var frac = s.match(/^([+-]?)(\d+)\/([+-]?)(\d+)$/);
    if (frac) {
      if (frac[2].length > 12 || frac[4].length > 12) throw new Error("Use 12 digits or fewer" + where + ".");
      var n = BigInt(frac[1] + frac[2]);
      var d = BigInt(frac[3] + frac[4]);
      if (d === 0n) throw new Error("The denominator cannot be zero" + where + ".");
      return rat(n, d);
    }
    var dec = s.match(/^([+-]?)(?:(\d+)\.(\d*)|\.(\d+)|(\d+))$/);
    if (!dec) throw new Error("Enter an integer, a decimal, or a fraction such as 3/4" + where + ".");
    var sign = dec[1] === "-" ? -1n : 1n;
    var digits;
    var places;
    if (dec[5] != null) {
      digits = dec[5];
      places = 0;
    } else if (dec[4] != null) {
      digits = dec[4];
      places = dec[4].length;
    } else {
      digits = dec[2] + (dec[3] || "");
      places = (dec[3] || "").length;
      if (digits.length === 0) digits = "0";
    }
    if (digits.length > 12) throw new Error("Use 12 digits or fewer" + where + ".");
    var den = 10n ** BigInt(places);
    return rat(sign * BigInt(digits), den);
  }

  function polyTrim(c) {
    var a = c.slice();
    while (a.length > 1 && isZero(a[a.length - 1])) a.pop();
    if (!a.length) return [ZERO];
    return a;
  }

  function polyDeg(c) {
    var a = polyTrim(c);
    if (a.length === 1 && isZero(a[0])) return -1;
    return a.length - 1;
  }

  function polyEq(a, b) {
    var x = polyTrim(a);
    var y = polyTrim(b);
    if (x.length !== y.length) return false;
    for (var i = 0; i < x.length; i++) if (!eq(x[i], y[i])) return false;
    return true;
  }

  function polyAdd(a, b) {
    var n = Math.max(a.length, b.length);
    var out = [];
    for (var i = 0; i < n; i++) out.push(add(a[i] || ZERO, b[i] || ZERO));
    return polyTrim(out);
  }

  function polyScale(c, s) {
    var out = [];
    for (var i = 0; i < c.length; i++) out.push(mul(c[i], s));
    return polyTrim(out);
  }

  function polyMul(a, b) {
    var x = polyTrim(a);
    var y = polyTrim(b);
    if (polyDeg(x) < 0 || polyDeg(y) < 0) return [ZERO];
    var out = [];
    var i;
    var j;
    for (i = 0; i < x.length + y.length - 1; i++) out.push(ZERO);
    for (i = 0; i < x.length; i++) {
      for (j = 0; j < y.length; j++) out[i + j] = add(out[i + j], mul(x[i], y[j]));
    }
    return polyTrim(out);
  }

  function polyDeriv(c) {
    var a = polyTrim(c);
    if (a.length <= 1) return [ZERO];
    var d = [];
    for (var i = 1; i < a.length; i++) d.push(mul(a[i], rat(BigInt(i), 1n)));
    return polyTrim(d);
  }

  function polyNeg(c) {
    return polyScale(c, NEG_ONE);
  }

  function at(c, i) {
    return i >= 0 && i < c.length ? c[i] : ZERO;
  }

  function evalPolyNum(c, x) {
    var y = 0;
    var xp = 1;
    for (var i = 0; i < c.length; i++) {
      y += ratToNumber(c[i]) * xp;
      xp *= x;
    }
    return y;
  }

  function evalPolyRat(c, x) {
    var y = ZERO;
    var xp = ONE;
    for (var i = 0; i < c.length; i++) {
      y = add(y, mul(c[i], xp));
      xp = mul(xp, x);
    }
    return y;
  }

  function antiderivative(p) {
    var a = polyTrim(p);
    if (polyDeg(a) < 0) return [ZERO];
    var f = [ZERO];
    for (var i = 0; i < a.length; i++) f.push(div(a[i], rat(BigInt(i + 1), 1n)));
    return polyTrim(f);
  }

  function integratePolyExp(qCoeffs, a) {
    var q = polyTrim(qCoeffs);
    if (polyDeg(q) < 0) return [ZERO];
    var n = q.length - 1;
    var u = [];
    var k;
    if (isZero(a)) {
      u = [ZERO];
      for (k = 0; k <= n; k++) u.push(div(q[k], rat(BigInt(k + 1), 1n)));
      return polyTrim(u);
    }
    for (k = 0; k <= n; k++) u.push(ZERO);
    u[n] = div(q[n], a);
    for (k = n - 1; k >= 0; k--) {
      u[k] = div(sub(q[k], mul(rat(BigInt(k + 1), 1n), u[k + 1])), a);
    }
    return polyTrim(u);
  }

  function integratePolyTrig(qs, qc, p, b) {
    var s = polyTrim(qs);
    var c = polyTrim(qc);
    var n = Math.max(polyDeg(s), polyDeg(c));
    if (n < 0) return { u: [ZERO], v: [ZERO] };
    var u = [];
    var v = [];
    var k;
    for (k = 0; k <= n; k++) {
      u.push(ZERO);
      v.push(ZERO);
    }
    var det = add(mul(p, p), mul(b, b));
    if (isZero(det)) throw new Error("The sine and cosine integral needs a nonzero frequency or a nonzero P.");
    for (k = n; k >= 0; k--) {
      var uNext = k + 1 <= n ? u[k + 1] : ZERO;
      var vNext = k + 1 <= n ? v[k + 1] : ZERO;
      var step = rat(BigInt(k + 1), 1n);
      var rhsU = sub(at(s, k), mul(step, uNext));
      var rhsV = sub(at(c, k), mul(step, vNext));
      u[k] = div(add(mul(p, rhsU), mul(b, rhsV)), det);
      v[k] = div(sub(mul(p, rhsV), mul(b, rhsU)), det);
    }
    return { u: polyTrim(u), v: polyTrim(v) };
  }

  function polynomialParticular(pCoeffs, qCoeffs) {
    var p = polyTrim(pCoeffs);
    var q = polyTrim(qCoeffs);
    var m = polyDeg(p);
    var n = polyDeg(q);
    if (m < 1) return { ok: false, reason: "constant" };
    if (n < 0) return { ok: true, coeffs: [ZERO] };
    if (n < m) return { ok: false, reason: "degree" };
    var k = n - m;
    var a = [];
    var j;
    for (j = 0; j <= k; j++) a.push(ZERO);
    a[k] = div(at(q, n), p[m]);
    var i;
    for (i = n - 1; i >= m; i--) {
      var known = ZERO;
      if (i + 1 <= k) known = mul(rat(BigInt(i + 1), 1n), a[i + 1]);
      for (j = i - m + 1; j <= k; j++) known = add(known, mul(at(p, i - j), a[j]));
      a[i - m] = div(sub(at(q, i), known), p[m]);
    }
    var left = polyAdd(polyDeriv(a), polyMul(p, a));
    if (!polyEq(left, q)) return { ok: false, reason: "mismatch", trial: polyTrim(a) };
    return { ok: true, coeffs: polyTrim(a) };
  }

  function fmtPower(i) {
    if (i === 0) return "";
    if (i === 1) return "x";
    return "x^" + i;
  }

  function fmtPoly(coeffs) {
    var c = polyTrim(coeffs);
    if (polyDeg(c) < 0) return "0";
    var terms = [];
    var i;
    for (i = c.length - 1; i >= 0; i--) {
      if (isZero(c[i])) continue;
      var first = terms.length === 0;
      var abs = absRat(c[i]);
      var neg = c[i].n < 0n;
      var pow = fmtPower(i);
      var mag;
      if (i === 0) mag = fmtRat(abs);
      else if (eq(abs, ONE)) mag = pow;
      else if (abs.d === 1n) mag = fmtRat(abs) + pow;
      else mag = "(" + fmtRat(abs) + ") " + pow;
      if (first) terms.push((neg ? MINUS : "") + mag);
      else terms.push((neg ? MINUS + " " : "+ ") + mag);
    }
    return terms.join(" ");
  }

  function fmtExpInside(coef, power) {
    var pow = power === 0 ? "" : fmtPower(power);
    if (power === 0) return fmtRat(coef);
    if (eq(coef, ONE)) return pow;
    if (eq(coef, NEG_ONE)) return MINUS + pow;
    if ((coef.n === 1n || coef.n === -1n) && coef.d !== 1n) {
      return (coef.n < 0n ? MINUS : "") + pow + "/" + coef.d.toString();
    }
    if (coef.d === 1n) return fmtRat(coef) + pow;
    return "(" + fmtRat(coef) + ") " + pow;
  }

  function fmtEToPoly(fCoeffs) {
    var f = polyTrim(fCoeffs);
    if (polyDeg(f) < 0) return "1";
    var idx = [];
    var i;
    for (i = 0; i < f.length; i++) if (!isZero(f[i])) idx.push(i);
    if (idx.length === 1) {
      var inside = fmtExpInside(f[idx[0]], idx[0]);
      if (inside === "x") return "e^x";
      if (inside === MINUS + "x") return "e^(" + MINUS + "x)";
      return "e^(" + inside + ")";
    }
    return "e^(" + fmtPoly(f) + ")";
  }

  function fmtAngle(b) {
    if (eq(b, ONE)) return "x";
    if (eq(b, NEG_ONE)) return MINUS + "x";
    if (b.d === 1n) return fmtRat(b) + "x";
    if (b.n === 1n || b.n === -1n) return (b.n < 0n ? MINUS : "") + "x/" + b.d.toString();
    return "(" + fmtRat(b) + ") x";
  }

  function fmtPolyTimesExp(poly, expText) {
    var p = polyTrim(poly);
    if (polyDeg(p) < 0) return "0";
    if (p.length === 1) {
      if (eq(p[0], ONE)) return expText;
      if (eq(p[0], NEG_ONE)) return MINUS + " " + expText;
      if (p[0].d !== 1n || p[0].n < 0n) return "(" + fmtRat(p[0]) + ") " + expText;
      return fmtRat(p[0]) + " " + expText;
    }
    var text = fmtPoly(p);
    if (text.indexOf("+") < 0 && text.indexOf(MINUS) < 0) return text + " " + expText;
    return "(" + text + ") " + expText;
  }

  function fmtTrigPart(sinPoly, cosPoly, b) {
    var sName = "sin(" + fmtAngle(b) + ")";
    var cName = "cos(" + fmtAngle(b) + ")";
    var parts = [];
    if (polyDeg(sinPoly) >= 0) parts.push(fmtPolyTimesExp(sinPoly, sName));
    if (polyDeg(cosPoly) >= 0) parts.push(fmtPolyTimesExp(cosPoly, cName));
    if (!parts.length) return "0";
    var text = parts[0];
    if (parts.length === 1) return text;
    if (parts[1].charAt(0) === MINUS) return text + " " + parts[1];
    return text + " + " + parts[1];
  }

  function joinParts(parts) {
    var kept = [];
    var i;
    for (i = 0; i < parts.length; i++) {
      if (!parts[i] || parts[i] === "0") continue;
      kept.push(parts[i]);
    }
    if (!kept.length) return "0";
    var text = kept[0];
    for (i = 1; i < kept.length; i++) {
      if (kept[i].charAt(0) === MINUS) text += " " + kept[i];
      else text += " + " + kept[i];
    }
    return text;
  }

  function fmtDecimal(x) {
    if (!isFinite(x)) return "undefined";
    var ax = Math.abs(x);
    var s;
    if (ax !== 0 && (ax < 1e-6 || ax >= 1e6)) s = x.toExponential(6);
    else s = x.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
    if (s === "-0") s = "0";
    return s.replace(/-/g, MINUS);
  }

  function blankToZero(raw) {
    return String(raw == null ? "" : raw).trim() === "";
  }

  function readCoeffList(values, label) {
    var list = values || [];
    if (list.length > MAX_DEGREE + 1) {
      throw new Error(label + " is limited to degree " + MAX_DEGREE + ".");
    }
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var name = i === 0 ? label + ", constant term" : label + ", coefficient of x^" + i;
      out.push(blankToZero(list[i]) ? ZERO : parseEntry(list[i], name));
    }
    if (!out.length) out.push(ZERO);
    var trimmed = polyTrim(out);
    if (polyDeg(trimmed) > MAX_DEGREE) throw new Error(label + " is limited to degree " + MAX_DEGREE + ".");
    return trimmed;
  }

  function parseSteps(raw) {
    var s = String(raw == null ? "" : raw).trim();
    if (!s) return 10;
    if (!/^[1-9]\d{0,2}$/.test(s)) throw new Error("The step count must be a whole number from 1 to 200.");
    var n = Number(s);
    if (n > 200) throw new Error("Use 200 steps or fewer.");
    return n;
  }

  function parseInput(input) {
    input = input || {};
    var pMode = input.pMode === "poly" ? "poly" : "constant";
    var qMode = input.qMode || "poly";
    if (qMode !== "poly" && qMode !== "exp" && qMode !== "trig") {
      throw new Error("Choose a polynomial, an exponential, or a sine and cosine for Q(x).");
    }
    var pPoly = pMode === "poly"
      ? readCoeffList(input.pCoeffs, "P(x)")
      : [blankToZero(input.p) ? ZERO : parseEntry(input.p, "P")];
    var qPoly = readCoeffList(input.qCoeffs && input.qCoeffs.length ? input.qCoeffs : ["0"], "Q(x)");
    var k = null;
    var A = null;
    var B = null;
    var b = null;
    if (qMode === "exp") {
      k = parseEntry(input.k, "k in e^(kx)");
      if (polyDeg(qPoly) < 0) qPoly = [ONE];
    }
    if (qMode === "trig") {
      A = parseEntry(input.A, "A, coefficient of sin");
      B = parseEntry(input.B, "B, coefficient of cos");
      b = parseEntry(input.b, "b in sin(bx) and cos(bx)");
      if (polyDeg(qPoly) < 0) qPoly = [ONE];
    }
    var xRaw = String(input.x0 == null ? "" : input.x0).trim();
    var yRaw = String(input.y0 == null ? "" : input.y0).trim();
    if ((xRaw === "") !== (yRaw === "")) {
      throw new Error("Enter both x\u2080 and y(x\u2080), or leave both blank.");
    }
    var hasIC = xRaw !== "";
    var x0 = hasIC ? parseEntry(xRaw, "x\u2080") : null;
    var y0 = hasIC ? parseEntry(yRaw, "y(x\u2080)") : null;
    var xEndRaw = String(input.xEnd == null ? "" : input.xEnd).trim();
    var xEnd = xEndRaw === "" ? null : parseEntry(xEndRaw, "the numerical endpoint");
    var nSteps = parseSteps(input.nSteps);
    return {
      pMode: pMode,
      qMode: qMode,
      pPoly: polyTrim(pPoly),
      qPoly: polyTrim(qPoly),
      k: k,
      A: A,
      B: B,
      b: b,
      hasIC: hasIC,
      x0: x0,
      y0: y0,
      xEnd: xEnd,
      nSteps: nSteps
    };
  }

  function fmtQ(parsed) {
    if (parsed.qMode === "poly") return fmtPoly(parsed.qPoly);
    if (parsed.qMode === "exp") return fmtPolyTimesExp(parsed.qPoly, fmtEToPoly([ZERO, parsed.k]));
    if (isZero(parsed.b)) return fmtPoly(polyScale(parsed.qPoly, parsed.B));
    var angle = fmtAngle(parsed.b);
    var osc = [];
    if (!isZero(parsed.A)) osc.push(fmtPolyTimesExp([parsed.A], "sin(" + angle + ")"));
    if (!isZero(parsed.B)) osc.push(fmtPolyTimesExp([parsed.B], "cos(" + angle + ")"));
    var oscText = osc.length ? joinParts(osc) : "0";
    if (polyDeg(parsed.qPoly) < 0 || (parsed.qPoly.length === 1 && eq(parsed.qPoly[0], ONE))) return oscText;
    if (parsed.qPoly.length === 1 && eq(parsed.qPoly[0], NEG_ONE)) return MINUS + " (" + oscText + ")";
    if (oscText.indexOf(" ") >= 0 || oscText.charAt(0) === MINUS) return "(" + fmtPoly(parsed.qPoly) + ") (" + oscText + ")";
    return fmtPolyTimesExp(parsed.qPoly, oscText);
  }

  function fmtEquation(parsed) {
    var pText = fmtPoly(parsed.pPoly);
    var qText = fmtQ(parsed);
    var left;
    if (pText === "0") left = "y'";
    else if (polyDeg(parsed.pPoly) <= 0) {
      if (eq(parsed.pPoly[0], ONE)) left = "y' + y";
      else if (eq(parsed.pPoly[0], NEG_ONE)) left = "y' " + MINUS + " y";
      else if (parsed.pPoly[0].n < 0n) left = "y' " + MINUS + " " + fmtRat(absRat(parsed.pPoly[0])) + "y";
      else left = "y' + " + pText + "y";
    } else if (pText.indexOf("+") < 0 && pText.indexOf(MINUS) < 0) left = "y' + " + pText + " y";
    else left = "y' + (" + pText + ") y";
    return left + " = " + qText;
  }

  function pFn(parsed, x) {
    return evalPolyNum(parsed.pPoly, x);
  }

  function qFn(parsed, x) {
    var base = evalPolyNum(parsed.qPoly, x);
    if (parsed.qMode === "poly") return base;
    if (parsed.qMode === "exp") return base * Math.exp(ratToNumber(parsed.k) * x);
    var b = ratToNumber(parsed.b);
    return base * (ratToNumber(parsed.A) * Math.sin(b * x) + ratToNumber(parsed.B) * Math.cos(b * x));
  }

  function modelTemplate(parsed, F) {
    return {
      F: F,
      poly: [ZERO],
      expK: null,
      expPoly: null,
      trigB: null,
      sinPoly: null,
      cosPoly: null,
      C: 1,
      hasIC: parsed.hasIC,
      x0: parsed.hasIC ? ratToNumber(parsed.x0) : 0,
      y0: parsed.hasIC ? ratToNumber(parsed.y0) : 0,
      parsed: parsed
    };
  }

  function evalY(model, x) {
    var y = evalPolyNum(model.poly, x);
    if (model.expK) y += evalPolyNum(model.expPoly, x) * Math.exp(ratToNumber(model.expK) * x);
    if (model.trigB) {
      var b = ratToNumber(model.trigB);
      y += evalPolyNum(model.sinPoly, x) * Math.sin(b * x);
      y += evalPolyNum(model.cosPoly, x) * Math.cos(b * x);
    }
    y += model.C * Math.exp(-evalPolyNum(model.F, x));
    return y;
  }

  function evalYp(model, x) {
    var yp = evalPolyNum(polyDeriv(model.poly), x);
    if (model.expK) {
      var k = ratToNumber(model.expK);
      var u = evalPolyNum(model.expPoly, x);
      var up = evalPolyNum(polyDeriv(model.expPoly), x);
      yp += Math.exp(k * x) * (k * u + up);
    }
    if (model.trigB) {
      var b = ratToNumber(model.trigB);
      var u = evalPolyNum(model.sinPoly, x);
      var up = evalPolyNum(polyDeriv(model.sinPoly), x);
      var v = evalPolyNum(model.cosPoly, x);
      var vp = evalPolyNum(polyDeriv(model.cosPoly), x);
      yp += (up - b * v) * Math.sin(b * x) + (b * u + vp) * Math.cos(b * x);
    }
    var f = evalPolyNum(model.F, x);
    var fp = evalPolyNum(polyDeriv(model.F), x);
    yp += model.C * Math.exp(-f) * (-fp);
    return yp;
  }

  function homoText(model) {
    return fmtEToPoly(polyNeg(model.F));
  }

  function particularText(model) {
    var parts = [];
    if (polyDeg(model.poly) >= 0) parts.push(fmtPoly(model.poly));
    if (model.expK && polyDeg(model.expPoly) >= 0) {
      parts.push(fmtPolyTimesExp(model.expPoly, fmtEToPoly([ZERO, model.expK])));
    }
    if (model.trigB && (polyDeg(model.sinPoly) >= 0 || polyDeg(model.cosPoly) >= 0)) {
      parts.push(fmtTrigPart(model.sinPoly, model.cosPoly, model.trigB));
    }
    return joinParts(parts);
  }

  function generalText(model) {
    var homo = homoText(model);
    var particular = particularText(model);
    var cPart = homo === "1" ? "C" : "C " + homo;
    if (particular === "0") return "y = " + cPart;
    return "y = " + joinParts([particular, cPart]);
  }

  function withConstantText(model, cRat) {
    var homo = homoText(model);
    var particular = particularText(model);
    var cPart;
    if (isZero(cRat)) cPart = "0";
    else if (homo === "1") cPart = cRat.n < 0n ? MINUS + " " + fmtRat(absRat(cRat)) : fmtRat(cRat);
    else if (eq(cRat, ONE)) cPart = homo;
    else if (eq(cRat, NEG_ONE)) cPart = MINUS + " " + homo;
    else if (cRat.d !== 1n) cPart = "(" + fmtRat(cRat) + ") " + homo;
    else cPart = fmtRat(cRat) + " " + homo;
    if (particular === "0") return "y = " + (cPart === "0" ? "0" : cPart);
    return "y = " + joinParts([particular, cPart]);
  }

  function particularValueRat(model, x0) {
    var y = evalPolyRat(model.poly, x0);
    if (model.expK) {
      var arg = mul(model.expK, x0);
      if (!isZero(arg)) return null;
      y = add(y, evalPolyRat(model.expPoly, x0));
    }
    if (model.trigB) {
      var barg = mul(model.trigB, x0);
      if (!isZero(barg)) return null;
      y = add(y, evalPolyRat(model.cosPoly, x0));
    }
    return y;
  }

  function applyIC(parsed, model) {
    if (!parsed.hasIC) {
      model.C = 1;
      model.sampleC = true;
      model.cExact = null;
      model.cExpression = null;
      return;
    }
    model.sampleC = false;
    var x0n = ratToNumber(parsed.x0);
    var y0n = ratToNumber(parsed.y0);
    var yp = evalY(Object.assign({}, model, { C: 0 }), x0n);
    var homo = Math.exp(-evalPolyNum(model.F, x0n));
    if (!isFinite(yp) || !isFinite(homo) || Math.abs(homo) < 1e-14) {
      throw new Error("The formula is not a usable real number at x\u2080. Check the initial point.");
    }
    model.C = (y0n - yp) / homo;
    var ypRat = particularValueRat(model, parsed.x0);
    var f0 = evalPolyRat(model.F, parsed.x0);
    if (ypRat && isZero(f0)) {
      model.cExact = sub(parsed.y0, ypRat);
      model.cExpression = null;
    } else if (ypRat) {
      model.cExact = null;
      var diff = sub(parsed.y0, ypRat);
      if (isZero(diff)) model.cExpression = "0";
      else if (eq(diff, ONE)) model.cExpression = fmtEToPoly([f0]);
      else if (eq(diff, NEG_ONE)) model.cExpression = MINUS + " " + fmtEToPoly([f0]);
      else model.cExpression = fmtRat(diff) + " " + fmtEToPoly([f0]);
    } else {
      model.cExact = null;
      model.cExpression = null;
    }
  }

  function reductionLines(q, a) {
    var lines = [];
    var u = integratePolyExp(q, a);
    if (isZero(a)) {
      lines.push("P contributes no exponential, so the integral is an ordinary antiderivative. The constant of integration is kept separate, as C.");
      var k;
      for (k = 0; k < q.length; k++) {
        if (isZero(q[k])) continue;
        lines.push("\u222B " + fmtPolyTermPower(q[k], k) + " dx contributes " + fmtPolyTermPower(div(q[k], rat(BigInt(k + 1), 1n)), k + 1) + ".");
      }
      lines.push("Antiderivative, up to C: " + fmtPoly(u) + ".");
      return lines;
    }
    lines.push("The antiderivative of e^(a x) times a polynomial is e^(a x) times another polynomial of the same degree, with a = " + fmtRat(a) + ".");
    lines.push("The coefficients satisfy u_n = q_n / a and u_k = (q_k " + MINUS + " (k+1) u_(k+1)) / a.");
    var n = q.length - 1;
    var k2;
    for (k2 = n; k2 >= 0; k2--) {
      if (k2 === n) {
        lines.push("Degree " + k2 + ": u = " + fmtRat(at(q, k2)) + " / " + fmtRat(a) + " = " + fmtRat(at(u, k2)) + ".");
      } else {
        lines.push("Degree " + k2 + ": u = (" + fmtRat(at(q, k2)) + " " + MINUS + " " + (k2 + 1) + " \u00b7 " + fmtRat(at(u, k2 + 1)) + ") / " + fmtRat(a) + " = " + fmtRat(at(u, k2)) + ".");
      }
    }
    lines.push("So \u222B e^(" + fmtExpInside(a, 1) + ") (" + fmtPoly(q) + ") dx = " + fmtPolyTimesExp(u, fmtEToPoly([ZERO, a])) + ", up to a constant.");
    return lines;
  }

  function fmtPolyTermPower(coef, power) {
    if (isZero(coef)) return "0";
    if (power === 0) return fmtRat(coef);
    if (eq(coef, ONE)) return fmtPower(power);
    if (eq(coef, NEG_ONE)) return MINUS + fmtPower(power);
    if (coef.d === 1n) return fmtRat(coef) + fmtPower(power);
    return "(" + fmtRat(coef) + ") " + fmtPower(power);
  }

  function tryExact(parsed) {
    var F = antiderivative(parsed.pPoly);
    var model = modelTemplate(parsed, F);
    var lines = [];
    var pConst = polyDeg(parsed.pPoly) <= 0 ? (parsed.pPoly[0] || ZERO) : null;
    lines.push("Standard form");
    lines.push("y' + P(x) y = Q(x).");
    lines.push(fmtEquation(parsed) + ".");
    lines.push("P(x) = " + fmtPoly(parsed.pPoly) + ".");
    lines.push("Q(x) = " + fmtQ(parsed) + ".");
    if (parsed.qMode === "trig" && isZero(parsed.b)) {
      lines.push("The frequency b is 0, so sin(bx) = 0 and cos(bx) = 1. Q(x) is the polynomial " + fmtPoly(polyScale(parsed.qPoly, parsed.B)) + ".");
    }
    lines.push("");
    lines.push("Integrating factor");
    lines.push("Any antiderivative of P may be used. This page takes the one whose constant term is 0, because an added constant only multiplies \u03bc by a nonzero constant and then cancels.");
    lines.push("\u222B P(x) dx = " + fmtPoly(F) + ".");
    lines.push("\u03bc(x) = e^(\u222B P dx) = " + fmtEToPoly(F) + ".");
    lines.push("");
    lines.push("Multiply through");
    lines.push("\u03bc y' + \u03bc P y = \u03bc Q.");
    lines.push("The left side is d/dx [ \u03bc(x) y ].");
    lines.push("d/dx [ " + fmtEToPoly(F) + " y ] = " + fmtEToPoly(F) + " Q(x).");

    if (pConst !== null) {
      var effectiveMode = parsed.qMode;
      var qForPoly = parsed.qPoly;
      if (parsed.qMode === "trig" && isZero(parsed.b)) {
        effectiveMode = "poly";
        qForPoly = polyScale(parsed.qPoly, parsed.B);
      }
      lines.push("");
      lines.push("Integrate");
      if (effectiveMode === "poly") {
        if (polyDeg(qForPoly) < 0) {
          lines.push("Q(x) = 0, so the integral of \u03bc Q is a constant. The equation is homogeneous.");
          model.poly = [ZERO];
        } else if (isZero(pConst)) {
          lines.push.apply(lines, reductionLines(qForPoly, ZERO));
          model.poly = integratePolyExp(qForPoly, ZERO);
        } else {
          lines.push.apply(lines, reductionLines(qForPoly, pConst));
          model.poly = integratePolyExp(qForPoly, pConst);
          lines.push("Divide by \u03bc(x) = " + fmtEToPoly(F) + ". The exponential in the integral cancels, and the constant of integration is multiplied by e^(" + MINUS + " \u222B P dx).");
        }
      } else if (effectiveMode === "exp") {
        var a = add(pConst, parsed.k);
        lines.push("\u03bc Q = " + fmtEToPoly(F) + " \u00b7 " + fmtQ(parsed) + " = " + fmtPolyTimesExp(parsed.qPoly, fmtEToPoly([ZERO, a])) + ".");
        if (isZero(a)) {
          lines.push("The exponents cancel, so the integral is an ordinary antiderivative of the polynomial.");
        }
        lines.push.apply(lines, reductionLines(parsed.qPoly, a));
        model.expK = parsed.k;
        model.expPoly = integratePolyExp(parsed.qPoly, a);
        lines.push("Divide by \u03bc. One exponential remains from Q, and the constant of integration carries e^(" + MINUS + " \u222B P dx).");
      } else {
        var qs = polyScale(parsed.qPoly, parsed.A);
        var qc = polyScale(parsed.qPoly, parsed.B);
        lines.push("\u03bc Q = " + fmtEToPoly(F) + " times (" + fmtTrigPart(qs, qc, parsed.b) + ").");
        lines.push("Look for an antiderivative " + fmtEToPoly(F) + " (u(x) sin(" + fmtAngle(parsed.b) + ") + v(x) cos(" + fmtAngle(parsed.b) + ")).");
        lines.push("Differentiate that product and match coefficients of sin and cos. With a = " + fmtRat(pConst) + " and b = " + fmtRat(parsed.b) + ", each degree is the 2 by 2 system a u " + MINUS + " b v = sine coefficient, and b u + a v = cosine coefficient, after the derivatives of higher coefficients are moved to the right-hand side.");
        var trig = integratePolyTrig(qs, qc, pConst, parsed.b);
        model.trigB = parsed.b;
        model.sinPoly = trig.u;
        model.cosPoly = trig.v;
        lines.push("u(x) = " + fmtPoly(trig.u) + ".");
        lines.push("v(x) = " + fmtPoly(trig.v) + ".");
        lines.push("Divide by \u03bc. The factor " + fmtEToPoly(F) + " cancels from this particular integral.");
      }
    } else if (parsed.qMode === "poly" || (parsed.qMode === "trig" && isZero(parsed.b))) {
      var qPoly = parsed.qMode === "poly" ? parsed.qPoly : polyScale(parsed.qPoly, parsed.B);
      lines.push("");
      lines.push("Integrate");
      if (polyDeg(qPoly) < 0) {
        lines.push("Q(x) = 0. The equation is homogeneous, so \u03bc y is a constant.");
        model.poly = [ZERO];
      } else {
        var trial = polynomialParticular(parsed.pPoly, qPoly);
        if (!trial.ok) {
        lines.push("\u222B \u03bc(x) Q(x) dx is not in the closed-form class this page computes.");
        if (polyDeg(qPoly) < polyDeg(parsed.pPoly)) {
          lines.push("Q has lower degree than P. A polynomial particular solution would make P y start at a higher power than Q, and y' cannot cancel that leading term.");
        } else {
          lines.push("A polynomial of degree " + (polyDeg(qPoly) - polyDeg(parsed.pPoly)) + " can match the leading power of Q, but the lower powers of y' + P y do not all agree with Q.");
        }
        lines.push("The integral of " + fmtEToPoly(F) + " times Q is not elementary in general. This page will not invent an antiderivative.");
          return { ok: false, lines: lines, F: F, reason: "The integral of \u03bc Q is not elementary for this polynomial P and Q." };
        }
        model.poly = trial.coeffs;
        lines.push("Because deg Q is at least deg P, test a polynomial particular solution of degree " + polyDeg(trial.coeffs) + ". The leading term comes from P y. The derivative y' cannot cancel it.");
        lines.push("That polynomial is y_p = " + fmtPoly(trial.coeffs) + ".");
        lines.push("Check by expanding y_p' + P y_p. Every power agrees with Q, so the integral of \u03bc Q is \u03bc y_p, up to a constant.");
        lines.push("Divide by \u03bc(x) = " + fmtEToPoly(F) + ".");
      }
    } else {
      lines.push("");
      lines.push("Integrate");
      lines.push("P(x) is not constant, and Q(x) is an exponential or a sine or cosine.");
      lines.push("\u222B " + fmtEToPoly(F) + " Q(x) dx is not in the closed-form class this page computes. A formula would be a guess. None is shown.");
      return { ok: false, lines: lines, F: F, reason: "The integral of \u03bc Q is not in the closed-form class for a nonconstant polynomial P and this Q." };
    }

    applyIC(parsed, model);
    lines.push("");
    lines.push("General solution");
    lines.push(generalText(model) + ".");
    lines.push("C is an arbitrary constant. The same family is produced by any other legal choice of the constant inside \u03bc.");
    if (parsed.hasIC) {
      lines.push("");
      lines.push("Initial condition");
      lines.push("y(" + fmtRat(parsed.x0) + ") = " + fmtRat(parsed.y0) + ".");
      if (model.cExact) {
        lines.push("Substitute x\u2080. The exponentials, sines, and cosines that appear are 0, 1, or " + MINUS + "1, so C is an exact fraction.");
        lines.push("C = " + fmtRat(model.cExact) + ".");
        lines.push("");
        lines.push("Particular solution");
        lines.push(withConstantText(model, model.cExact) + ".");
      } else if (model.cExpression) {
        lines.push("The particular piece is a rational number at x\u2080, and the homogeneous piece contributes an exponential of \u222B P.");
        lines.push("C = " + model.cExpression + ".");
        lines.push("Decimal approximation of that constant: C \u2248 " + fmtDecimal(model.C) + ". The decimal is not the exact constant.");
      } else {
        lines.push("At this x\u2080 the formula contains an exponential, a sine, or a cosine that this page does not simplify to a fraction.");
        lines.push("C = (y\u2080 " + MINUS + " y_p(x\u2080)) / y_h(x\u2080), where y_h is the homogeneous solution with C = 1.");
        lines.push("Decimal approximation: C \u2248 " + fmtDecimal(model.C) + ". The decimal is not an exact constant.");
      }
    } else {
      lines.push("No initial condition was entered, so C stays arbitrary.");
    }
    return { ok: true, model: model, lines: lines, F: F };
  }

  function verifyNumeric(solved, sampleX) {
    if (!solved || solved.mode !== "exact") return { ok: false, reason: "not exact" };
    var model = solved.numeric;
    var parsed = model.parsed;
    var xs = sampleX || [-0.4, 0, 0.25, 0.7];
    var worst = 0;
    var used = 0;
    for (var i = 0; i < xs.length; i++) {
      var x = xs[i];
      var y = evalY(model, x);
      var yp = evalYp(model, x);
      var residual = yp + pFn(parsed, x) * y - qFn(parsed, x);
      if (!isFinite(residual) || !isFinite(y) || !isFinite(yp)) continue;
      var scale = Math.max(1, Math.abs(yp), Math.abs(pFn(parsed, x) * y), Math.abs(qFn(parsed, x)));
      worst = Math.max(worst, Math.abs(residual) / scale);
      used += 1;
    }
    if (parsed.hasIC) {
      var yIc = evalY(model, model.x0);
      var scaleIc = Math.max(1, Math.abs(model.y0));
      if (isFinite(yIc)) {
        worst = Math.max(worst, Math.abs(yIc - model.y0) / scaleIc);
        used += 1;
      }
    }
    return { ok: used >= 2 && worst < 1e-6, worst: worst, used: used };
  }

  function rk4(pAt, qAt, x0, y0, xEnd, nSteps) {
    if (!(nSteps >= 1)) throw new Error("Use at least one step.");
    var h = (xEnd - x0) / nSteps;
    if (!isFinite(h) || h === 0) throw new Error("The endpoint must differ from x\u2080.");
    function f(x, y) { return qAt(x) - pAt(x) * y; }
    var rows = [];
    var y = y0;
    var i;
    for (i = 0; i <= nSteps; i++) {
      var x = x0 + i * h;
      if (!isFinite(y)) throw new Error("The numerical solution left the real numbers. Try a shorter interval or a smaller step.");
      rows.push({ i: i, x: x, y: y, slope: f(x, y) });
      if (i === nSteps) break;
      var k1 = f(x, y);
      var k2 = f(x + h / 2, y + h * k1 / 2);
      var k3 = f(x + h / 2, y + h * k2 / 2);
      var k4 = f(x + h, y + h * k3);
      if (![k1, k2, k3, k4].every(isFinite)) {
        throw new Error("A Runge-Kutta stage was not a real number. Try a shorter interval.");
      }
      y = y + h * (k1 + 2 * k2 + 2 * k3 + k4) / 6;
    }
    return { h: h, rows: rows };
  }

  function numericalSolution(parsed, prelude, reason) {
    var lines = prelude.slice();
    lines.push("");
    lines.push("Numerical solution");
    lines.push(reason);
    lines.push("The method below is the classical fourth-order Runge-Kutta method for y' = Q(x) " + MINUS + " P(x) y. The rows are approximations. They are not a closed form.");
    if (!parsed.hasIC) {
      lines.push("An initial condition is required before a numerical table can start. Enter y(x\u2080) = y\u2080, an endpoint, and a step count. No formula is shown.");
      return {
        mode: "needs-ic",
        amount: "No closed form in this calculator's class",
        general: null,
        lines: lines,
        text: lines.join("\n"),
        reason: reason
      };
    }
    var x0 = ratToNumber(parsed.x0);
    var y0 = ratToNumber(parsed.y0);
    var xEnd = parsed.xEnd ? ratToNumber(parsed.xEnd) : x0 + 1;
    if (!isFinite(x0) || !isFinite(y0) || !isFinite(xEnd)) throw new Error("The initial condition or the endpoint is not a usable real number.");
    if (xEnd === x0) throw new Error("The numerical endpoint must differ from x\u2080.");
    var table = rk4(function (x) { return pFn(parsed, x); }, function (x) { return qFn(parsed, x); }, x0, y0, xEnd, parsed.nSteps);
    lines.push("Initial condition y(" + fmtRat(parsed.x0) + ") = " + fmtRat(parsed.y0) + ".");
    lines.push("Endpoint x = " + (parsed.xEnd ? fmtRat(parsed.xEnd) : fmtDecimal(xEnd) + " (one unit past x\u2080, because the endpoint box was blank)") + ".");
    lines.push("Steps: " + parsed.nSteps + ". Step size h = " + fmtDecimal(table.h) + ".");
    lines.push("y(" + fmtDecimal(xEnd) + ") \u2248 " + fmtDecimal(table.rows[table.rows.length - 1].y) + ", from the last row.");
    return {
      mode: "rk4",
      amount: "y(" + fmtDecimal(xEnd) + ") \u2248 " + fmtDecimal(table.rows[table.rows.length - 1].y),
      general: null,
      lines: lines,
      text: lines.join("\n"),
      table: table,
      reason: reason,
      x0: x0,
      y0: y0,
      xEnd: xEnd,
      parsed: parsed
    };
  }

  function finishExact(built) {
    var model = built.model;
    var check = verifyNumeric({ mode: "exact", numeric: model });
    if (!check.ok) {
      return numericalSolution(model.parsed, built.lines, "An internal numeric check rejected the closed form, so it is not displayed. " + (built.reason || ""));
    }
    var lines = built.lines.slice();
    lines.push("");
    lines.push("Check");
    lines.push("Differentiate the solution and substitute it into y' + P y. On the sample points, the largest relative residual against Q is " + (check.worst < 1e-9 ? "smaller than 10^(" + MINUS + "9)" : fmtDecimal(check.worst)) + ".");
    if (model.parsed.hasIC) lines.push("The solution also meets y(x\u2080) = y\u2080 in that same check.");
    var amount;
    if (model.cExact) amount = withConstantText(model, model.cExact);
    else amount = generalText(model);
    if (model.parsed.hasIC && !model.cExact) {
      amount += "  with  C \u2248 " + fmtDecimal(model.C);
    }
    return {
      mode: "exact",
      amount: amount,
      general: generalText(model),
      particular: model.cExact ? withConstantText(model, model.cExact) : null,
      lines: lines,
      text: lines.join("\n"),
      numeric: model,
      cExact: model.cExact ? fmtRat(model.cExact) : null,
      cDecimal: model.parsed.hasIC ? model.C : null,
      equation: fmtEquation(model.parsed)
    };
  }

  function solve(input) {
    var parsed = parseInput(input);
    var built = tryExact(parsed);
    if (!built.ok) return numericalSolution(parsed, built.lines, built.reason);
    return finishExact(built);
  }

  function chooseWindow(solved) {
    var numeric = solved.numeric;
    var center = numeric.hasIC ? numeric.x0 : 0;
    var half = 3;
    var attempt;
    for (attempt = 0; attempt < 8; attempt++) {
      var maxAbs = 0;
      var finite = 0;
      var i;
      for (i = 0; i <= 80; i++) {
        var x = center - half + (2 * half) * i / 80;
        var y = evalY(numeric, x);
        if (isFinite(y)) {
          finite += 1;
          maxAbs = Math.max(maxAbs, Math.abs(y));
        }
      }
      if (finite > 40 && maxAbs > 1e-8 && maxAbs < 40) return { center: center, half: half };
      if (!(maxAbs < 40)) half *= 0.55;
      else half *= 1.35;
      if (half < 0.2) break;
    }
    return { center: center, half: Math.max(half, 0.35) };
  }

  function drawPlot(solved) {
    var canvas = document.getElementById("fol-plot");
    var legend = document.getElementById("fol-legend");
    if (!canvas || !canvas.getContext) return;
    var pts = [];
    var xMin;
    var xMax;
    var summary;
    if (solved.mode === "exact") {
      var window = chooseWindow(solved);
      xMin = window.center - window.half;
      xMax = window.center + window.half;
      var n = 240;
      var i;
      for (i = 0; i <= n; i++) {
        var x = xMin + (xMax - xMin) * i / n;
        pts.push({ x: x, y: evalY(solved.numeric, x) });
      }
      summary = solved.numeric.hasIC
        ? "Plot of the particular solution from x = " + fmtDecimal(xMin) + " to x = " + fmtDecimal(xMax) + ". The marked point is the initial condition."
        : "Plot of one sample solution, with C = 1, from x = " + fmtDecimal(xMin) + " to x = " + fmtDecimal(xMax) + ".";
    } else if (solved.mode === "rk4") {
      xMin = solved.table.rows[0].x;
      xMax = solved.table.rows[solved.table.rows.length - 1].x;
      if (xMin === xMax) {
        xMin -= 1;
        xMax += 1;
      }
      pts = solved.table.rows.map(function (row) { return { x: row.x, y: row.y }; });
      summary = "Plot of the Runge-Kutta table from x = " + fmtDecimal(xMin) + " to x = " + fmtDecimal(xMax) + ". The marked point is the initial condition. The curve is the numerical approximation, not a closed form.";
    } else {
      canvas.hidden = true;
      if (legend) legend.textContent = "";
      return;
    }
    canvas.hidden = false;
    var yLo = Infinity;
    var yHi = -Infinity;
    var j;
    for (j = 0; j < pts.length; j++) {
      if (!isFinite(pts[j].y)) continue;
      if (pts[j].y < yLo) yLo = pts[j].y;
      if (pts[j].y > yHi) yHi = pts[j].y;
    }
    if (!isFinite(yLo) || !isFinite(yHi)) {
      yLo = -1;
      yHi = 1;
    }
    if (yHi === yLo) {
      yLo -= 1;
      yHi += 1;
    }
    var rawSpan = yHi - yLo;
    if (rawSpan > 80) {
      var mid = solved.mode === "exact" && solved.numeric.hasIC ? solved.numeric.y0 : (solved.y0 || 0);
      yLo = mid - 20;
      yHi = mid + 20;
    }
    var padY = 0.08 * (yHi - yLo || 1);
    yLo -= padY;
    yHi += padY;

    var cssW = canvas.clientWidth;
    if (!cssW && canvas.parentElement) cssW = canvas.parentElement.clientWidth - 48;
    if (!cssW || cssW < 260) cssW = 520;
    var cssH = Math.round(cssW * 280 / 560);
    var dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + "px";
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var W = cssW;
    var H = cssH;
    var padL = 48;
    var padR = 12;
    var padT = 14;
    var padB = 28;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;
    function xPix(xv) { return padL + (xv - xMin) / (xMax - xMin) * plotW; }
    function yPix(yv) { return padT + (yHi - yv) / (yHi - yLo) * plotH; }
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#d8d2c6";
    ctx.lineWidth = 1;
    ctx.strokeRect(padL, padT, plotW, plotH);
    ctx.strokeStyle = "#c5c0b4";
    ctx.beginPath();
    if (yLo < 0 && yHi > 0) {
      ctx.moveTo(padL, yPix(0));
      ctx.lineTo(padL + plotW, yPix(0));
    }
    if (xMin < 0 && xMax > 0) {
      ctx.moveTo(xPix(0), padT);
      ctx.lineTo(xPix(0), padT + plotH);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = "#243a61";
    ctx.lineWidth = 2;
    var pen = false;
    for (j = 0; j < pts.length; j++) {
      var py = pts[j].y;
      if (!isFinite(py) || py < yLo || py > yHi) {
        pen = false;
        continue;
      }
      var px = xPix(pts[j].x);
      var yy = yPix(py);
      if (!pen) {
        ctx.moveTo(px, yy);
        pen = true;
      } else ctx.lineTo(px, yy);
    }
    ctx.stroke();
    var markX = solved.mode === "exact" ? solved.numeric.x0 : solved.x0;
    var markY = solved.mode === "exact" ? solved.numeric.y0 : solved.y0;
    var mark = solved.mode === "exact" ? solved.numeric.hasIC : true;
    if (mark && isFinite(markY)) {
      ctx.beginPath();
      ctx.fillStyle = "#8b5a2b";
      ctx.arc(xPix(markX), yPix(markY), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#4a5160";
    ctx.font = "12px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(fmtDecimal(xMin), padL, padT + plotH + 6);
    ctx.fillText(fmtDecimal(xMax), padL + plotW, padT + plotH + 6);
    ctx.fillText("x", padL + plotW / 2, padT + plotH + 6);
    canvas.setAttribute("aria-label", summary);
    if (legend) legend.textContent = summary;
  }

  function renderTable(solved) {
    var host = document.getElementById("fol-table");
    if (!host) return;
    while (host.firstChild) host.removeChild(host.firstChild);
    if (!solved.table) return;
    var table = document.createElement("table");
    table.className = "stat-table";
    var caption = document.createElement("caption");
    caption.textContent = "Runge-Kutta approximation. Each y value is a numerical step, not an exact formula.";
    table.appendChild(caption);
    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");
    ["step", "x", "y", "slope y'"].forEach(function (label) {
      var th = document.createElement("th");
      th.scope = "col";
      th.textContent = label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    var body = document.createElement("tbody");
    solved.table.rows.forEach(function (row) {
      var tr = document.createElement("tr");
      [String(row.i), fmtDecimal(row.x), fmtDecimal(row.y), fmtDecimal(row.slope)].forEach(function (value) {
        var td = document.createElement("td");
        td.textContent = value;
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    table.appendChild(body);
    host.appendChild(table);
  }

  function showError(message) {
    var error = document.getElementById("fol-error");
    var result = document.getElementById("fol-result");
    if (error) {
      error.textContent = message;
      error.classList.add("visible");
    }
    if (result) result.classList.remove("visible");
  }

  function render(solved) {
    var error = document.getElementById("fol-error");
    var result = document.getElementById("fol-result");
    var amount = document.getElementById("fol-amount");
    var detail = document.getElementById("fol-detail");
    if (error) {
      error.textContent = "";
      error.classList.remove("visible");
    }
    if (amount) amount.textContent = solved.amount;
    if (detail) detail.textContent = solved.text;
    renderTable(solved);
    if (result) result.classList.add("visible");
    drawPlot(solved);
  }

  function field(id) {
    var node = document.getElementById(id);
    return node ? node.value : "";
  }

  function readForm() {
    return {
      pMode: field("fol-p-mode"),
      p: field("fol-p"),
      pCoeffs: [field("fol-p0"), field("fol-p1"), field("fol-p2"), field("fol-p3"), field("fol-p4")],
      qMode: field("fol-q-mode"),
      qCoeffs: [field("fol-q0"), field("fol-q1"), field("fol-q2"), field("fol-q3"), field("fol-q4")],
      k: field("fol-k"),
      A: field("fol-A"),
      B: field("fol-B"),
      b: field("fol-b"),
      x0: field("fol-x0"),
      y0: field("fol-y0"),
      xEnd: field("fol-x-end"),
      nSteps: field("fol-steps")
    };
  }

  function setVal(id, value) {
    var node = document.getElementById(id);
    if (node) node.value = value;
  }

  function syncFields() {
    var pMode = field("fol-p-mode");
    var qMode = field("fol-q-mode");
    var pConst = document.getElementById("fol-p-constant");
    var pPoly = document.getElementById("fol-p-poly");
    var exp = document.getElementById("fol-exp-fields");
    var trig = document.getElementById("fol-trig-fields");
    var qHint = document.getElementById("fol-q-hint");
    if (pConst) pConst.hidden = pMode !== "constant";
    if (pPoly) pPoly.hidden = pMode !== "poly";
    if (exp) exp.hidden = qMode !== "exp";
    if (trig) trig.hidden = qMode !== "trig";
    if (qHint) {
      if (qMode === "exp") qHint.textContent = "Q(x) = (polynomial) e^(kx). For a pure exponential, put the amplitude in the constant term and leave the higher coefficients blank or 0.";
      else if (qMode === "trig") qHint.textContent = "Q(x) = (polynomial) times (A sin(bx) + B cos(bx)). For sin(x) alone, use constant term 1, A = 1, B = 0, and b = 1.";
      else qHint.textContent = "Q(x) is the polynomial whose coefficients are below. Leave a blank box as 0.";
    }
  }

  var PRESETS = [
    {
      id: "fol-preset-poly",
      pMode: "constant",
      p: "2",
      pCoeffs: ["", "", "", "", ""],
      qMode: "poly",
      qCoeffs: ["0", "4", "", "", ""],
      k: "1",
      A: "1",
      B: "0",
      b: "1",
      x0: "0",
      y0: "1",
      xEnd: "",
      nSteps: "10"
    },
    {
      id: "fol-preset-trig",
      pMode: "constant",
      p: "1",
      pCoeffs: ["", "", "", "", ""],
      qMode: "trig",
      qCoeffs: ["1", "", "", "", ""],
      k: "1",
      A: "1",
      B: "0",
      b: "1",
      x0: "0",
      y0: "1",
      xEnd: "",
      nSteps: "10"
    },
    {
      id: "fol-preset-factor",
      pMode: "poly",
      p: "0",
      pCoeffs: ["0", "2", "", "", ""],
      qMode: "poly",
      qCoeffs: ["0", "2", "", "", ""],
      k: "1",
      A: "1",
      B: "0",
      b: "1",
      x0: "0",
      y0: "3",
      xEnd: "",
      nSteps: "10"
    },
    {
      id: "fol-preset-numeric",
      pMode: "poly",
      p: "0",
      pCoeffs: ["0", "1", "", "", ""],
      qMode: "poly",
      qCoeffs: ["1", "", "", "", ""],
      k: "1",
      A: "1",
      B: "0",
      b: "1",
      x0: "0",
      y0: "0",
      xEnd: "1",
      nSteps: "10"
    }
  ];

  function fill(values) {
    setVal("fol-p-mode", values.pMode);
    setVal("fol-p", values.p);
    setVal("fol-p0", values.pCoeffs[0]);
    setVal("fol-p1", values.pCoeffs[1]);
    setVal("fol-p2", values.pCoeffs[2]);
    setVal("fol-p3", values.pCoeffs[3]);
    setVal("fol-p4", values.pCoeffs[4]);
    setVal("fol-q-mode", values.qMode);
    setVal("fol-q0", values.qCoeffs[0]);
    setVal("fol-q1", values.qCoeffs[1]);
    setVal("fol-q2", values.qCoeffs[2]);
    setVal("fol-q3", values.qCoeffs[3]);
    setVal("fol-q4", values.qCoeffs[4]);
    setVal("fol-k", values.k);
    setVal("fol-A", values.A);
    setVal("fol-B", values.B);
    setVal("fol-b", values.b);
    setVal("fol-x0", values.x0);
    setVal("fol-y0", values.y0);
    setVal("fol-x-end", values.xEnd);
    setVal("fol-steps", values.nSteps);
    syncFields();
  }

  function boot() {
    var form = document.getElementById("fol-form");
    if (!form) return;
    ["fol-p-mode", "fol-q-mode"].forEach(function (id) {
      var node = document.getElementById(id);
      if (node) node.addEventListener("change", syncFields);
    });
    syncFields();
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      try {
        render(solve(readForm()));
      } catch (err) {
        showError(err && err.message ? err.message : "The equation could not be solved.");
      }
    });
    var reset = document.getElementById("fol-reset");
    if (reset) {
      reset.addEventListener("click", function () {
        fill(PRESETS[0]);
        try { render(solve(readForm())); } catch (err) { showError(err.message); }
      });
    }
    PRESETS.forEach(function (preset) {
      var button = document.getElementById(preset.id);
      if (!button) return;
      button.addEventListener("click", function () {
        fill(preset);
        try { render(solve(readForm())); } catch (err) { showError(err.message); }
      });
    });
    window.addEventListener("resize", function () {
      var result = document.getElementById("fol-result");
      if (!result || !result.classList.contains("visible")) return;
      try { drawPlot(solve(readForm())); } catch (err) { /* keep the last good plot */ }
    });
    try { render(solve(readForm())); } catch (err) { showError(err.message); }
  }

  return {
    PRESETS: PRESETS,
    parseEntry: parseEntry,
    fmtRat: fmtRat,
    fmtPoly: fmtPoly,
    solve: solve,
    verifyNumeric: verifyNumeric,
    evalY: evalY,
    evalYp: evalYp,
    rk4: rk4,
    boot: boot,
    MINUS: MINUS
  };
});
