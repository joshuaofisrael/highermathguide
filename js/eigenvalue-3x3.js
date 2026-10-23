/* 3 by 3 eigenvalues, characteristic polynomial, and real eigenvectors.
   Rational arithmetic where the roots are rational. Numeric roots otherwise. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.Eigenvalue3Exact = api;
  if (typeof document !== "undefined") api.boot();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MINUS = "\u2212";
  var SUP3 = "\u00b3";
  var SUP2 = "\u00b2";
  var SUB = ["\u2081", "\u2082", "\u2083"];
  var LAMBDA = "\u03bb";

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

  function lcm(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    if (a === 0n || b === 0n) return 0n;
    return (a / gcd(a, b)) * b;
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
  var TWO = rat(2n, 1n);
  var FOUR = rat(4n, 1n);

  function fmt(a) {
    var sign = a.n < 0n ? MINUS : "";
    var n = a.n < 0n ? -a.n : a.n;
    if (a.d === 1n) return sign + n.toString();
    return sign + n.toString() + "/" + a.d.toString();
  }

  function fmtNum(x) {
    if (!isFinite(x)) return "undefined";
    var ax = Math.abs(x);
    if (Object.is(x, -0) || ax < 1e-12) return "0";
    var negSign = x < 0;
    var s = ax.toPrecision(10);
    if (/e/i.test(s)) {
      s = s.replace(/e\+/, "e").replace(/-/g, MINUS);
      s = s.replace(/(\.\d*?)0+(e)/i, "$1$2").replace(/\.e/i, "e");
    } else if (s.indexOf(".") !== -1) {
      s = s.replace(/0+$/, "").replace(/\.$/, "");
    }
    return negSign ? MINUS + s : s;
  }

  function toFloat(a) {
    var n = a.n < 0n ? -a.n : a.n;
    var sign = a.n < 0n ? -1 : 1;
    return sign * (Number(n) / Number(a.d));
  }

  function isqrt(n) {
    if (n < 0n) throw new Error("Square root of a negative integer.");
    if (n < 2n) return n;
    var x = n;
    var y = (x + 1n) / 2n;
    while (y < x) {
      x = y;
      y = (x + n / x) / 2n;
    }
    return x;
  }

  function isSquareInt(n) {
    if (n < 0n) return false;
    var r = isqrt(n);
    return r * r === n;
  }

  function isSquareRat(a) {
    return a.n >= 0n && isSquareInt(a.n) && isSquareInt(a.d);
  }

  function sqrtRat(a) {
    return rat(isqrt(a.n), isqrt(a.d));
  }

  function parseEntry(raw, label) {
    var where = label ? " for " + label : "";
    var s = String(raw == null ? "" : raw).trim().replace(/\s+/g, "");
    s = s.replace(/[\u2212\u2013\u2014]/g, "-");
    if (!s) throw new Error("Enter an integer, a decimal, or a fraction such as 3/4" + where + ".");
    var frac = s.match(/^([+-]?)(\d+)\/([+-]?)(\d+)$/);
    if (frac) {
      if (frac[2].length > 40 || frac[4].length > 40) {
        throw new Error("Use 40 digits or fewer" + where + ".");
      }
      var n = BigInt(frac[1] + frac[2]);
      var d = BigInt(frac[3] + frac[4]);
      if (d === 0n) throw new Error("The denominator cannot be zero" + where + ".");
      return rat(n, d);
    }
    var dec = s.match(/^([+-]?)(?:(\d+)\.(\d*)|\.(\d+)|(\d+))$/);
    if (!dec) {
      throw new Error("Enter an integer, a decimal, or a fraction such as 3/4" + where + ".");
    }
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
    if (digits.length > 40) throw new Error("Use 40 digits or fewer" + where + ".");
    var den = 10n ** BigInt(places);
    return rat(sign * BigInt(digits), den);
  }

  function xName(index) {
    return "x" + SUB[index];
  }

  function lambdaPow(power) {
    if (power === 3) return LAMBDA + SUP3;
    if (power === 2) return LAMBDA + SUP2;
    if (power === 1) return LAMBDA;
    return "";
  }

  function formatPoly(coeffsHighToLow) {
    var parts = [];
    var power = coeffsHighToLow.length - 1;
    for (var i = 0; i < coeffsHighToLow.length; i++, power--) {
      var coef = coeffsHighToLow[i];
      if (isZero(coef)) continue;
      var abs = absRat(coef);
      var mag;
      if (power === 0) mag = fmt(abs);
      else if (eq(abs, ONE)) mag = lambdaPow(power);
      else if (abs.d === 1n) mag = fmt(abs) + lambdaPow(power);
      else mag = "(" + fmt(abs) + ")" + lambdaPow(power);
      parts.push({ neg: coef.n < 0n, mag: mag });
    }
    if (!parts.length) return "0";
    var s = parts[0].neg ? MINUS + parts[0].mag : parts[0].mag;
    for (var k = 1; k < parts.length; k++) {
      s += parts[k].neg ? " " + MINUS + " " + parts[k].mag : " + " + parts[k].mag;
    }
    return s;
  }

  function formatVector(values, numeric) {
    var inner = values.map(function (v) { return numeric ? fmtNum(v) : fmt(v); }).join(", ");
    return "(" + inner + ")";
  }

  function englishList(items) {
    if (items.length === 0) return "";
    if (items.length === 1) return String(items[0]);
    if (items.length === 2) return items[0] + " and " + items[1];
    return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
  }

  function minorDelete(A, row, col) {
    var m = [];
    for (var r = 0; r < 3; r++) {
      if (r === row) continue;
      var line = [];
      for (var c = 0; c < 3; c++) {
        if (c === col) continue;
        line.push(A[r][c]);
      }
      m.push(line);
    }
    return m;
  }

  function det2(m) {
    return sub(mul(m[0][0], m[1][1]), mul(m[0][1], m[1][0]));
  }

  function det3(A) {
    var terms = [];
    for (var j = 0; j < 3; j++) {
      var minor = det2(minorDelete(A, 0, j));
      var signed = j === 1 ? neg(mul(A[0][j], minor)) : mul(A[0][j], minor);
      terms.push({ entry: A[0][j], minor: minor, signed: signed, col: j });
    }
    var det = terms.reduce(function (s, t) { return add(s, t.signed); }, ZERO);
    return { det: det, terms: terms };
  }

  function matVec(A, v) {
    var out = [];
    for (var i = 0; i < 3; i++) {
      var s = ZERO;
      for (var k = 0; k < 3; k++) s = add(s, mul(A[i][k], v[k]));
      out.push(s);
    }
    return out;
  }

  function scaleVec(lambda, v) {
    return v.map(function (c) { return mul(lambda, c); });
  }

  function evalPoly(coeffs, x) {
    var s = ZERO;
    for (var i = 0; i < coeffs.length; i++) s = add(mul(s, x), coeffs[i]);
    return s;
  }

  function synthDivide(coeffs, r) {
    var out = [coeffs[0]];
    for (var i = 1; i < coeffs.length; i++) {
      out.push(add(coeffs[i], mul(out[i - 1], r)));
    }
    var rem = out.pop();
    return { quot: out, rem: rem };
  }

  function divisors(n) {
    n = n < 0n ? -n : n;
    if (n === 0n) return [1n];
    if (n > 1000000000000n) return null;
    var small = [];
    var large = [];
    for (var i = 1n; i * i <= n; i++) {
      if (n % i === 0n) {
        small.push(i);
        if (i * i !== n) large.push(n / i);
      }
    }
    return small.concat(large.reverse());
  }

  function integerCoeffs(coeffs) {
    var den = 1n;
    for (var i = 0; i < coeffs.length; i++) den = lcm(den, coeffs[i].d);
    var ints = coeffs.map(function (c) { return c.n * (den / c.d); });
    var g = 0n;
    for (var j = 0; j < ints.length; j++) g = gcd(g, ints[j]);
    return ints.map(function (v) { return v / g; });
  }

  function rationalCandidates(coeffs) {
    var ints = integerCoeffs(coeffs);
    if (ints[ints.length - 1] === 0n) return [ZERO];
    var leadDivs = divisors(ints[0]);
    var constDivs = divisors(ints[ints.length - 1]);
    if (!leadDivs || !constDivs) return null;
    var seen = {};
    var cands = [];
    for (var qi = 0; qi < leadDivs.length; qi++) {
      for (var pi = 0; pi < constDivs.length; pi++) {
        var values = [rat(constDivs[pi], leadDivs[qi])];
        if (constDivs[pi] !== 0n) values.push(rat(-constDivs[pi], leadDivs[qi]));
        for (var vi = 0; vi < values.length; vi++) {
          var key = values[vi].n.toString() + "/" + values[vi].d.toString();
          if (seen[key]) continue;
          seen[key] = true;
          cands.push(values[vi]);
        }
      }
    }
    cands.sort(function (a, b) {
      if (a.d !== b.d) return a.d < b.d ? -1 : 1;
      var aa = a.n < 0n ? -a.n : a.n;
      var bb = b.n < 0n ? -b.n : b.n;
      if (aa !== bb) return aa < bb ? -1 : 1;
      if (a.n === b.n) return 0;
      return a.n > b.n ? -1 : 1;
    });
    return cands;
  }

  function recognizeRat(x) {
    if (!isFinite(x)) return null;
    var sign = x < 0 ? -1n : 1n;
    var target = Math.abs(x);
    if (target > 1e12) return null;
    var maxDen = 1000000n;
    var h0 = 0n;
    var h1 = 1n;
    var k0 = 1n;
    var k1 = 0n;
    var v = target;
    for (var i = 0; i < 24; i++) {
      var a = Math.floor(v + 1e-12);
      if (!isFinite(a) || a > 1e9) break;
      var ai = BigInt(a);
      var h = ai * h1 + h0;
      var k = ai * k1 + k0;
      if (k > maxDen) break;
      h0 = h1;
      k0 = k1;
      h1 = h;
      k1 = k;
      var approx = Number(h1) / Number(k1);
      if (Math.abs(approx - target) <= 1e-8 * (1 + target)) return rat(sign * h1, k1);
      var frac = v - a;
      if (frac < 1e-12) return rat(sign * h1, k1);
      v = 1 / frac;
    }
    return null;
  }

  function exactReal(value) {
    return {
      real: true,
      exact: true,
      reRat: value,
      imRat: ZERO,
      re: toFloat(value),
      im: 0
    };
  }

  function exactComplex(reRat, imRat) {
    return {
      real: isZero(imRat),
      exact: true,
      reRat: reRat,
      imRat: imRat,
      re: toFloat(reRat),
      im: toFloat(imRat)
    };
  }

  function numericReal(re) {
    return { real: true, exact: false, reRat: null, imRat: null, re: re, im: 0 };
  }

  function numericComplex(re, im, reRat) {
    return {
      real: Math.abs(im) < 1e-12,
      exact: false,
      reRat: reRat || null,
      imRat: null,
      re: re,
      im: im
    };
  }

  function newtonCubic(a, b, c, x) {
    for (var i = 0; i < 30; i++) {
      var p = ((x + a) * x + b) * x + c;
      var dp = (3 * x + 2 * a) * x + b;
      if (!isFinite(p) || !isFinite(dp)) break;
      if (Math.abs(dp) < 1e-14) break;
      var dx = p / dp;
      x -= dx;
      if (Math.abs(dx) <= 1e-14 * (1 + Math.abs(x))) break;
    }
    return x;
  }

  function numericCubicRoots(a, b, c) {
    var p = b - (a * a) / 3;
    var q = (2 * a * a * a - 9 * a * b) / 27 + c;
    var disc = (q * q) / 4 + (p * p * p) / 27;
    var shift = -a / 3;
    var scale = 1 + Math.abs(a) + Math.abs(b) + Math.abs(c);
    var tol = 1e-10 * scale * scale;
    var roots = [];
    if (disc > tol) {
      var s = Math.sqrt(disc);
      var u = Math.cbrt(-q / 2 + s);
      var v = Math.cbrt(-q / 2 - s);
      var real = newtonCubic(a, b, c, u + v + shift);
      var B = a + real;
      var C = b + real * B;
      var qdisc = B * B - 4 * C;
      roots.push({ re: real, im: 0 });
      if (qdisc >= -tol) {
        var sd = qdisc < 0 ? 0 : Math.sqrt(qdisc);
        roots.push({ re: newtonCubic(a, b, c, (-B + sd) / 2), im: 0 });
        roots.push({ re: newtonCubic(a, b, c, (-B - sd) / 2), im: 0 });
      } else {
        roots.push({ re: -B / 2, im: Math.sqrt(-qdisc) / 2 });
        roots.push({ re: -B / 2, im: -Math.sqrt(-qdisc) / 2 });
      }
    } else if (disc < -tol) {
      var rad = Math.sqrt(-p / 3);
      var arg = (-q / 2) / (rad * rad * rad);
      if (arg > 1) arg = 1;
      if (arg < -1) arg = -1;
      var theta = Math.acos(arg);
      for (var k = 0; k < 3; k++) {
        var xk = 2 * rad * Math.cos((theta - 2 * Math.PI * k) / 3);
        roots.push({ re: newtonCubic(a, b, c, xk + shift), im: 0 });
      }
    } else if (Math.abs(p) <= tol) {
      var z = newtonCubic(a, b, c, shift);
      roots.push({ re: z, im: 0 }, { re: z, im: 0 }, { re: z, im: 0 });
    } else {
      var u0 = Math.cbrt(-q / 2);
      var r1 = newtonCubic(a, b, c, 2 * u0 + shift);
      var r2 = newtonCubic(a, b, c, -u0 + shift);
      roots.push({ re: r1, im: 0 }, { re: r2, im: 0 }, { re: r2, im: 0 });
    }
    return roots;
  }

  function solveQuadratic(B, C) {
    var disc = sub(mul(B, B), mul(FOUR, C));
    var half = div(neg(B), TWO);
    if (isZero(disc)) return [exactReal(half), exactReal(half)];
    if (disc.n < 0n) {
      var mag = rat(-disc.n, disc.d);
      if (isSquareRat(mag)) {
        var imag = div(sqrtRat(mag), TWO);
        return [exactComplex(half, imag), exactComplex(half, neg(imag))];
      }
      var re = toFloat(half);
      var im = Math.sqrt(toFloat(mag)) / 2;
      return [numericComplex(re, im, half), numericComplex(re, -im, half)];
    }
    if (isSquareRat(disc)) {
      var s = sqrtRat(disc);
      return [exactReal(div(add(neg(B), s), TWO)), exactReal(div(sub(neg(B), s), TWO))];
    }
    var mid = toFloat(half);
    var delta = Math.sqrt(toFloat(disc)) / 2;
    return [numericReal(mid + delta), numericReal(mid - delta)];
  }

  function findRationalRoot(coeffs) {
    var cands = rationalCandidates(coeffs);
    if (cands) {
      for (var i = 0; i < cands.length; i++) {
        if (isZero(evalPoly(coeffs, cands[i]))) return cands[i];
      }
    }
    var af = toFloat(coeffs[1]);
    var bf = toFloat(coeffs[2]);
    var cf = toFloat(coeffs[3]);
    var nums = numericCubicRoots(af, bf, cf);
    for (var k = 0; k < nums.length; k++) {
      if (Math.abs(nums[k].im) > 1e-8) continue;
      var guess = recognizeRat(nums[k].re);
      if (guess && isZero(evalPoly(coeffs, guess))) return guess;
    }
    return null;
  }

  function solveCubic(a, b, c) {
    var coeffs = [ONE, a, b, c];
    var hit = findRationalRoot(coeffs);
    if (!hit) {
      var nums = numericCubicRoots(toFloat(a), toFloat(b), toFloat(c));
      return nums.map(function (r) {
        if (Math.abs(r.im) > 1e-8) return numericComplex(r.re, r.im, null);
        var guess = recognizeRat(r.re);
        if (guess && isZero(evalPoly(coeffs, guess))) return exactReal(guess);
        return numericReal(r.re);
      });
    }
    var roots = [];
    var guard = 0;
    while (hit && coeffs.length > 2 && guard < 4) {
      if (!isZero(evalPoly(coeffs, hit))) break;
      var divided = synthDivide(coeffs, hit);
      if (!isZero(divided.rem)) break;
      roots.push(exactReal(hit));
      coeffs = divided.quot;
      guard += 1;
    }
    if (coeffs.length === 3) roots = roots.concat(solveQuadratic(coeffs[1], coeffs[2]));
    else if (coeffs.length === 2) {
      var lead = coeffs[0];
      roots.push(exactReal(neg(div(coeffs[1], lead))));
    }
    return roots;
  }

  function rootSort(a, b) {
    if (Math.abs(a.re - b.re) > 1e-9) return a.re - b.re;
    return a.im - b.im;
  }

  function groupRoots(roots) {
    var groups = [];
    function close(a, b) {
      return Math.abs(a.re - b.re) <= 1e-7 * (1 + Math.abs(a.re)) &&
        Math.abs(a.im - b.im) <= 1e-7 * (1 + Math.abs(a.im));
    }
    roots.forEach(function (r) {
      var found = null;
      for (var i = 0; i < groups.length; i++) {
        var g = groups[i];
        if (r.exact && g.exact && eq(r.reRat, g.reRat) && eq(r.imRat, g.imRat)) {
          found = g;
          break;
        }
        if ((!r.exact || !g.exact) && close(r, g)) {
          found = g;
          break;
        }
      }
      if (!found) {
        groups.push({
          real: r.real && Math.abs(r.im) < 1e-10,
          exact: r.exact,
          reRat: r.reRat,
          imRat: r.imRat,
          re: r.re,
          im: r.im,
          multiplicity: 1
        });
      } else {
        found.multiplicity += 1;
        if (r.exact && !found.exact) {
          found.exact = true;
          found.reRat = r.reRat;
          found.imRat = r.imRat;
          found.re = r.re;
          found.im = r.im;
          found.real = r.real;
        }
      }
    });
    groups.sort(rootSort);
    return groups;
  }

  function formatEigenvalue(g) {
    if (g.real || Math.abs(g.im) < 1e-10) {
      if (g.exact && g.reRat) return fmt(g.reRat);
      return fmtNum(g.re);
    }
    var reExact = !!(g.exact && g.reRat) || !!(g.reRat && isZero(g.imRat || ZERO) === false && g.reRat);
    var reKnown = g.reRat;
    var imKnown = g.exact ? g.imRat : null;
    var reStr = reKnown ? fmt(reKnown) : fmtNum(g.re);
    var imAbsRat = imKnown ? absRat(imKnown) : null;
    var imAbsNum = Math.abs(g.im);
    var imNeg = imKnown ? imKnown.n < 0n : g.im < 0;
    var reZero = reKnown ? isZero(reKnown) : Math.abs(g.re) < 1e-10;
    var imBody;
    if (imKnown) {
      if (eq(imAbsRat, ONE)) imBody = "i";
      else if (imAbsRat.d === 1n) imBody = fmt(imAbsRat) + "i";
      else imBody = "(" + fmt(imAbsRat) + ")i";
    } else if (Math.abs(imAbsNum - 1) < 1e-9) {
      imBody = "i";
    } else {
      imBody = fmtNum(imAbsNum) + "i";
    }
    if (reZero) return imNeg ? MINUS + imBody : imBody;
    return reStr + (imNeg ? " " + MINUS + " " : " + ") + imBody;
  }

  function formatRows(M, numeric) {
    return [0, 1, 2].map(function (i) {
      return "Row " + (i + 1) + ": " + M[i].map(function (v) {
        return numeric ? fmtNum(v) : fmt(v);
      }).join(", ");
    });
  }

  function primitiveVector(v) {
    var D = 1n;
    for (var i = 0; i < 3; i++) D = lcm(D, v[i].d);
    var ints = v.map(function (c) { return c.n * (D / c.d); });
    var g = 0n;
    for (var j = 0; j < 3; j++) g = gcd(g, ints[j]);
    ints = ints.map(function (n) { return n / g; });
    for (var k = 0; k < 3; k++) {
      if (ints[k] < 0n) {
        ints = ints.map(function (n) { return -n; });
        break;
      }
      if (ints[k] > 0n) break;
    }
    var prim = ints.map(function (n) { return rat(n, 1n); });
    var multiplier = ONE;
    for (var t = 0; t < 3; t++) {
      if (!isZero(v[t])) {
        multiplier = div(prim[t], v[t]);
        break;
      }
    }
    return { vector: prim, multiplier: multiplier };
  }

  function vectorsMatch(a, b) {
    for (var i = 0; i < 3; i++) if (!eq(a[i], b[i])) return false;
    return true;
  }

  function exactEigenvector(A, lambda) {
    var M = A.map(function (row, i) {
      return row.map(function (entry, j) {
        return i === j ? sub(entry, lambda) : entry;
      });
    });
    var lines = [];
    lines.push("A " + MINUS + " " + LAMBDA + "I with " + LAMBDA + " = " + fmt(lambda));
    lines = lines.concat(formatRows(M, false));
    lines.push("");

    var R = M.map(function (row) { return row.slice(); });
    var stepNo = 0;
    function record(sentence) {
      stepNo += 1;
      lines.push(stepNo + ". " + sentence);
      lines = lines.concat(formatRows(R, false));
      lines.push("");
    }

    var pivotCols = [];
    var pivotRow = 0;
    for (var col = 0; col < 3 && pivotRow < 3; col++) {
      var swapFrom = -1;
      for (var i = pivotRow; i < 3; i++) {
        if (!isZero(R[i][col])) {
          swapFrom = i;
          break;
        }
      }
      if (swapFrom < 0) continue;
      if (swapFrom !== pivotRow) {
        var tmp = R[pivotRow];
        R[pivotRow] = R[swapFrom];
        R[swapFrom] = tmp;
        record(
          "Swap row " + (pivotRow + 1) + " and row " + (swapFrom + 1) +
          ", because row " + (pivotRow + 1) + " has a zero in column " + (col + 1) +
          " and row " + (swapFrom + 1) + " does not."
        );
      }
      if (!eq(R[pivotRow][col], ONE)) {
        var scale = div(ONE, R[pivotRow][col]);
        for (var c = 0; c < 3; c++) R[pivotRow][c] = mul(R[pivotRow][c], scale);
        record(
          "Multiply row " + (pivotRow + 1) + " by " + fmt(scale) +
          " so the pivot in column " + (col + 1) + " is 1."
        );
      }
      for (var rr = 0; rr < 3; rr++) {
        if (rr === pivotRow || isZero(R[rr][col])) continue;
        var addend = neg(R[rr][col]);
        for (var cc = 0; cc < 3; cc++) R[rr][cc] = add(R[rr][cc], mul(addend, R[pivotRow][cc]));
        record(
          "Add " + fmt(addend) + " times row " + (pivotRow + 1) +
          " to row " + (rr + 1) + " to clear the entry in column " + (col + 1) + "."
        );
      }
      pivotCols.push(col);
      pivotRow += 1;
    }

    if (stepNo === 0) {
      lines.push("No row operation is needed. The matrix is already in reduced row echelon form.");
      lines.push("");
    }
    lines.push("Reduced row echelon form");
    lines = lines.concat(formatRows(R, false));
    lines.push("");

    var free = [];
    for (var f = 0; f < 3; f++) if (pivotCols.indexOf(f) === -1) free.push(f);
    var rawVectors = [];
    for (var fi = 0; fi < free.length; fi++) {
      var v = [ZERO, ZERO, ZERO];
      v[free[fi]] = ONE;
      for (var p = 0; p < pivotCols.length; p++) {
        v[pivotCols[p]] = neg(R[p][free[fi]]);
      }
      rawVectors.push(v);
    }

    if (free.length === 0) {
      lines.push("The only solution is the zero vector, so this value is not an eigenvalue.");
      lines.push("");
    } else if (free.length === 1) {
      lines.push("Free variable: " + xName(free[0]) + ". The other variables are determined by it.");
    } else {
      lines.push("Free variables: " + englishList(free.map(xName)) + ".");
    }

    var vectors = [];
    for (var vi = 0; vi < rawVectors.length; vi++) {
      var raw = rawVectors[vi];
      var made = primitiveVector(raw);
      if (free.length > 1) {
        lines.push("Case " + (vi + 1) + ": set " + xName(free[vi]) + " = 1 and the other free variables to 0.");
      } else if (free.length === 1) {
        lines.push("Set " + xName(free[0]) + " = 1.");
      }
      lines.push("One null vector is " + formatVector(raw, false) + ".");
      if (!eq(made.multiplier, ONE)) {
        if (eq(made.multiplier, neg(ONE))) {
          lines.push("Multiply by " + MINUS + "1 so the first nonzero entry is positive.");
        } else if (made.multiplier.n > 0n && made.multiplier.d === 1n) {
          lines.push("Multiply by " + fmt(made.multiplier) + " to clear the denominator.");
        } else {
          lines.push(
            "Multiply by " + fmt(made.multiplier) +
            " to clear denominators and make the first nonzero entry positive."
          );
        }
      }
      lines.push("An eigenvector is " + formatVector(made.vector, false) + ".");
      var image = matVec(A, made.vector);
      var scaled = scaleVec(lambda, made.vector);
      var ok = vectorsMatch(image, scaled);
      lines.push(
        "Check. A times " + formatVector(made.vector, false) + " = " + formatVector(image, false) +
        ", and " + fmt(lambda) + " times the vector is " + formatVector(scaled, false) +
        (ok ? ". They agree." : ". They do not agree, so do not trust this vector.")
      );
      lines.push("");
      vectors.push({
        components: made.vector,
        text: formatVector(made.vector, false),
        verified: ok
      });
    }

    return {
      vectors: vectors,
      lines: lines,
      geometric: vectors.length,
      rank: pivotCols.length
    };
  }

  function floatMatVec(A, v) {
    var out = [0, 0, 0];
    for (var i = 0; i < 3; i++) {
      for (var k = 0; k < 3; k++) out[i] += A[i][k] * v[k];
    }
    return out;
  }

  function floatNorm(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  }

  function residual(A, lambda, v) {
    var Av = floatMatVec(A, v);
    var diff = [Av[0] - lambda * v[0], Av[1] - lambda * v[1], Av[2] - lambda * v[2]];
    var denom = floatNorm(v) * (1 + Math.abs(lambda));
    if (denom < 1e-15) return floatNorm(diff);
    return floatNorm(diff) / denom;
  }

  function scaleNumeric(v) {
    var big = 0;
    var idx = 0;
    for (var i = 0; i < 3; i++) {
      if (Math.abs(v[i]) > big) {
        big = Math.abs(v[i]);
        idx = i;
      }
    }
    if (big < 1e-15) return [0, 0, 0];
    var sign = v[idx] < 0 ? -1 : 1;
    return v.map(function (c) { return (sign * c) / big; });
  }

  function numericEigenvector(A, lambda) {
    var Af = A.map(function (row) { return row.map(toFloat); });
    var M = Af.map(function (row, i) {
      return row.map(function (entry, j) { return entry - (i === j ? lambda : 0); });
    });
    var lines = [];
    lines.push("A " + MINUS + " " + LAMBDA + "I with " + LAMBDA + " " + "about " + fmtNum(lambda) + ". The entries are numeric because this eigenvalue is not rational.");
    lines = lines.concat(formatRows(M, true));
    lines.push("");

    var R = M.map(function (row) { return row.slice(); });
    var scale = 1;
    for (var si = 0; si < 3; si++) {
      for (var sj = 0; sj < 3; sj++) scale = Math.max(scale, Math.abs(R[si][sj]));
    }
    var tol = 1e-8 * scale;
    var stepNo = 0;
    function record(sentence) {
      stepNo += 1;
      lines.push(stepNo + ". " + sentence);
      lines = lines.concat(formatRows(R, true));
      lines.push("");
    }
    var pivotCols = [];
    var pivotRow = 0;
    for (var col = 0; col < 3 && pivotRow < 3; col++) {
      var best = pivotRow;
      var bestAbs = Math.abs(R[pivotRow][col]);
      for (var i = pivotRow + 1; i < 3; i++) {
        if (Math.abs(R[i][col]) > bestAbs) {
          best = i;
          bestAbs = Math.abs(R[i][col]);
        }
      }
      if (bestAbs <= tol) {
        for (var z = pivotRow; z < 3; z++) R[z][col] = 0;
        continue;
      }
      if (best !== pivotRow) {
        var tmp = R[pivotRow];
        R[pivotRow] = R[best];
        R[best] = tmp;
        record(
          "Swap row " + (pivotRow + 1) + " and row " + (best + 1) +
          " so column " + (col + 1) + " has the largest available pivot."
        );
      }
      var piv = R[pivotRow][col];
      if (Math.abs(piv - 1) > 1e-12) {
        for (var c = 0; c < 3; c++) R[pivotRow][c] = R[pivotRow][c] / piv;
        record(
          "Multiply row " + (pivotRow + 1) + " by " + fmtNum(1 / piv) +
          " so the pivot in column " + (col + 1) + " is 1."
        );
      }
      for (var rr = 0; rr < 3; rr++) {
        if (rr === pivotRow || Math.abs(R[rr][col]) <= tol) {
          R[rr][col] = rr === pivotRow ? R[rr][col] : 0;
          continue;
        }
        var addend = -R[rr][col];
        for (var cc = 0; cc < 3; cc++) R[rr][cc] = R[rr][cc] + addend * R[pivotRow][cc];
        record(
          "Add " + fmtNum(addend) + " times row " + (pivotRow + 1) +
          " to row " + (rr + 1) + " to clear the entry in column " + (col + 1) + "."
        );
      }
      pivotCols.push(col);
      pivotRow += 1;
    }
    for (var ri = 0; ri < 3; ri++) {
      for (var cj = 0; cj < 3; cj++) if (Math.abs(R[ri][cj]) < tol) R[ri][cj] = 0;
    }
    if (stepNo === 0) {
      lines.push("No row operation is needed.");
      lines.push("");
    }
    lines.push("Reduced row echelon form, up to rounding");
    lines = lines.concat(formatRows(R, true));
    lines.push("");

    var free = [];
    for (var f = 0; f < 3; f++) if (pivotCols.indexOf(f) === -1) free.push(f);
    if (!free.length) free = [2];
    var chosenFree = free[0];
    var raw = [0, 0, 0];
    raw[chosenFree] = 1;
    for (var p = 0; p < pivotCols.length; p++) raw[pivotCols[p]] = -R[p][chosenFree];
    var fromRows = scaleNumeric(raw);

    function cross(u, v) {
      return [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0]
      ];
    }
    var bestCross = null;
    var bestN = 0;
    for (var a = 0; a < 3; a++) {
      for (var b = a + 1; b < 3; b++) {
        var cr = cross(M[a], M[b]);
        var n = floatNorm(cr);
        if (n > bestN) {
          bestN = n;
          bestCross = cr;
        }
      }
    }
    var fromCross = bestCross ? scaleNumeric(bestCross) : fromRows;
    var resRow = residual(Af, lambda, fromRows);
    var resCross = residual(Af, lambda, fromCross);
    var vector = resRow <= resCross * 1.5 ? fromRows : fromCross;
    var res = Math.min(resRow, resCross);
    if (resCross + 1e-15 < resRow * 0.5) {
      lines.push("Row reduction is wobbly at this numeric eigenvalue, so the eigenvector is the cross product of the two most independent rows of A " + MINUS + " " + LAMBDA + "I. That cross product is orthogonal to both rows.");
      vector = fromCross;
      res = resCross;
    }
    lines.push("An eigenvector is about " + formatVector(vector, true) + ".");
    var Av = floatMatVec(Af, vector);
    lines.push(
      "Check. A times the vector is about " + formatVector(Av, true) +
      ", and " + LAMBDA + " times the vector is about " +
      formatVector(vector.map(function (c) { return lambda * c; }), true) + "."
    );
    lines.push("The relative residual is about " + fmtNum(res) + ".");
    lines.push("");
    return {
      vectors: [{
        components: vector,
        text: formatVector(vector, true),
        numeric: true,
        verified: res < 1e-6
      }],
      lines: lines,
      geometric: 1,
      residual: res
    };
  }

  function complexProduct(roots) {
    var re = ONE;
    var im = ZERO;
    for (var i = 0; i < roots.length; i++) {
      var r = roots[i];
      if (!r.exact || !r.reRat || !r.imRat) return null;
      var nre = sub(mul(re, r.reRat), mul(im, r.imRat));
      var nim = add(mul(re, r.imRat), mul(im, r.reRat));
      re = nre;
      im = nim;
    }
    if (!isZero(im)) return null;
    return re;
  }

  function complexSum(roots) {
    var re = ZERO;
    var im = ZERO;
    for (var i = 0; i < roots.length; i++) {
      var r = roots[i];
      if (!r.exact || !r.reRat || !r.imRat) return null;
      re = add(re, r.reRat);
      im = add(im, r.imRat);
    }
    if (!isZero(im)) return null;
    return re;
  }

  function solve(A) {
    if (!A || A.length !== 3 || A.some(function (row) { return !row || row.length !== 3; })) {
      throw new Error("A 3 by 3 matrix needs nine entries.");
    }
    var lines = [];
    lines.push("Characteristic polynomial det(A " + MINUS + " " + LAMBDA + "I).");
    lines.push("");

    var trace = add(add(A[0][0], A[1][1]), A[2][2]);
    lines.push(
      "Trace = a" + SUB[0] + SUB[0] + " + a" + SUB[1] + SUB[1] + " + a" + SUB[2] + SUB[2] +
      " = " + fmt(A[0][0]) + " + " + fmt(A[1][1]) + " + " + fmt(A[2][2]) + " = " + fmt(trace) + "."
    );
    lines.push("");

    var minorMats = [0, 1, 2].map(function (i) { return minorDelete(A, i, i); });
    var minors = minorMats.map(det2);
    for (var mi = 0; mi < 3; mi++) {
      var mm = minorMats[mi];
      var ad = mul(mm[0][0], mm[1][1]);
      var bc = mul(mm[0][1], mm[1][0]);
      lines.push(
        "Principal 2 by 2 minor M" + SUB[mi] + SUB[mi] +
        " deletes row " + (mi + 1) + " and column " + (mi + 1) +
        ", leaving " + fmt(mm[0][0]) + ", " + fmt(mm[0][1]) + "; " +
        fmt(mm[1][0]) + ", " + fmt(mm[1][1]) + "."
      );
      lines.push(
        "M" + SUB[mi] + SUB[mi] + " = (" + fmt(mm[0][0]) + ")(" + fmt(mm[1][1]) + ") " +
        MINUS + " (" + fmt(mm[0][1]) + ")(" + fmt(mm[1][0]) + ") = " +
        fmt(ad) + " " + MINUS + " " + fmt(bc) + " = " + fmt(minors[mi]) + "."
      );
      lines.push("");
    }
    var sigma = minors.reduce(function (s, m) { return add(s, m); }, ZERO);
    lines.push(
      "Sum of the principal 2 by 2 minors = " +
      fmt(minors[0]) + " + " + fmt(minors[1]) + " + " + fmt(minors[2]) + " = " + fmt(sigma) + "."
    );
    lines.push("");

    var expanded = det3(A);
    var det = expanded.det;
    lines.push("Determinant by cofactor expansion along row 1.");
    for (var j = 0; j < 3; j++) {
      var block = minorDelete(A, 0, j);
      var term = expanded.terms[j];
      lines.push(
        "The minor for column " + (j + 1) + " deletes row 1 and column " + (j + 1) +
        ", leaving " + fmt(block[0][0]) + ", " + fmt(block[0][1]) + "; " +
        fmt(block[1][0]) + ", " + fmt(block[1][1]) + "."
      );
      lines.push(
        "That minor is (" + fmt(block[0][0]) + ")(" + fmt(block[1][1]) + ") " + MINUS + " (" +
        fmt(block[0][1]) + ")(" + fmt(block[1][0]) + ") = " + fmt(term.minor) + "."
      );
      var signWord = j === 1 ? "minus" : "plus";
      lines.push(
        "a" + SUB[0] + SUB[j] + " times that minor is (" + fmt(A[0][j]) + ")(" + fmt(term.minor) +
        ") = " + fmt(mul(A[0][j], term.minor)) + ". The cofactor sign is " + signWord +
        ", so this term is " + fmt(term.signed) + "."
      );
      lines.push("");
    }
    var detSum = "";
    expanded.terms.forEach(function (term, index) {
      if (index === 0) detSum += fmt(term.signed);
      else if (term.signed.n < 0n) detSum += " " + MINUS + " " + fmt(neg(term.signed));
      else detSum += " + " + fmt(term.signed);
    });
    lines.push("det(A) = " + detSum + " = " + fmt(det) + ".");
    lines.push("");

    var polyDet = formatPoly([neg(ONE), trace, neg(sigma), det]);
    var polyMonic = formatPoly([ONE, neg(trace), sigma, neg(det)]);
    lines.push(
      "det(A " + MINUS + " " + LAMBDA + "I) = " + MINUS + LAMBDA + SUP3 + " + (trace)" + LAMBDA + SUP2 +
      " " + MINUS + " (sum of the principal 2 by 2 minors)" + LAMBDA + " + det(A)."
    );
    lines.push("det(A " + MINUS + " " + LAMBDA + "I) = " + polyDet + ".");
    lines.push("");
    lines.push(
      "The eigenvalues are the roots. They also solve the monic equation " + polyMonic + " = 0, " +
      "which is " + LAMBDA + SUP3 + " " + MINUS + " (trace)" + LAMBDA + SUP2 +
      " + (sum of the principal 2 by 2 minors)" + LAMBDA + " " + MINUS + " det(A) = 0."
    );
    lines.push("");

    var aCoef = neg(trace);
    var bCoef = sigma;
    var cCoef = neg(det);
    var rawRoots = solveCubic(aCoef, bCoef, cCoef);
    if (rawRoots.length !== 3) {
      throw new Error("The cubic solver did not return three roots.");
    }

    var hit = null;
    var monicCoeffs = [ONE, aCoef, bCoef, cCoef];
    var cands = rationalCandidates(monicCoeffs);
    if (cands) {
      for (var ci = 0; ci < cands.length; ci++) {
        if (isZero(evalPoly(monicCoeffs, cands[ci]))) {
          hit = cands[ci];
          break;
        }
      }
    }
    if (!hit) {
      for (var ri = 0; ri < rawRoots.length; ri++) {
        if (rawRoots[ri].exact && rawRoots[ri].real) {
          hit = rawRoots[ri].reRat;
          break;
        }
      }
    }

    if (hit) {
      lines.push(LAMBDA + " = " + fmt(hit) + " is a rational root. Substitution into the monic polynomial gives 0.");
      var deflated = synthDivide(monicCoeffs, hit);
      var quot = formatPoly(deflated.quot);
      lines.push("Dividing by " + LAMBDA + " " + MINUS + " " + fmt(hit) + " leaves " + quot + ".");
      var extra = 1;
      var running = deflated.quot;
      while (running.length > 2 && isZero(evalPoly(running, hit))) {
        extra += 1;
        running = synthDivide(running, hit).quot;
      }
      if (extra > 1) {
        lines.push("That root has multiplicity " + extra + ", because it is also a root of the quotient.");
      }
      if (deflated.quot.length === 3 && extra === 1) {
        var B = deflated.quot[1];
        var C = deflated.quot[2];
        var disc = sub(mul(B, B), mul(FOUR, C));
        lines.push(
          "Discriminant of " + quot + " = (" + fmt(B) + ")" + SUP2 + " " + MINUS + " 4(" + fmt(C) + ") = " + fmt(disc) + "."
        );
        if (disc.n < 0n) {
          lines.push("The discriminant is negative, so the other two eigenvalues are a complex conjugate pair.");
        } else if (isZero(disc)) {
          lines.push("The discriminant is 0, so the other eigenvalue is a repeated real root.");
        } else if (isSquareRat(disc)) {
          lines.push("The discriminant is a perfect square, so the other two eigenvalues are rational.");
        } else {
          lines.push("The discriminant is positive and not a perfect square, so the other two eigenvalues are real and irrational. They are reported numerically.");
        }
      }
      lines.push("");
    } else {
      lines.push("No rational root was found. The three eigenvalues are reported numerically. A real cubic always has at least one real root, and nonreal roots come in a conjugate pair.");
      lines.push("");
    }

    var groups = groupRoots(rawRoots);
    var labels = groups.map(function (g) {
      var label = formatEigenvalue(g);
      if (g.multiplicity > 1) label += " (multiplicity " + g.multiplicity + ")";
      return label;
    });
    lines.push("Eigenvalues: " + englishList(labels) + ".");
    lines.push("");

    var eigenspaces = [];
    var allVerified = true;
    groups.forEach(function (g) {
      if (!g.real && Math.abs(g.im) >= 1e-8) {
        lines.push(
          "Eigenvalue " + formatEigenvalue(g) + " is not real. A real matrix sends real vectors to real vectors, so this eigenvalue has no real eigenvector. Its conjugate is the other nonreal eigenvalue."
        );
        lines.push("");
        eigenspaces.push({
          label: formatEigenvalue(g),
          real: false,
          algebraic: g.multiplicity,
          geometric: 0,
          vectors: [],
          lines: []
        });
        return;
      }
      lines.push("Eigenvector for " + LAMBDA + " = " + formatEigenvalue(g) + ".");
      if (g.multiplicity > 1) {
        lines.push("Algebraic multiplicity is " + g.multiplicity + ".");
      }
      var space;
      if (g.exact && g.reRat) space = exactEigenvector(A, g.reRat);
      else space = numericEigenvector(A, g.re);
      lines = lines.concat(space.lines);
      if (g.multiplicity > 1 || space.geometric !== 1) {
        lines.push(
          "Geometric multiplicity is " + space.geometric +
          (g.multiplicity > 1 ? " and algebraic multiplicity is " + g.multiplicity + "." : ".")
        );
        if (space.geometric < g.multiplicity) {
          lines.push("There are fewer independent eigenvectors than the algebraic multiplicity, so this eigenvalue alone blocks a basis of eigenvectors.");
        }
        lines.push("");
      }
      space.vectors.forEach(function (vec) {
        if (!vec.verified) allVerified = false;
      });
      eigenspaces.push({
        label: formatEigenvalue(g),
        real: true,
        exact: !!g.exact,
        algebraic: g.multiplicity,
        geometric: space.geometric,
        vectors: space.vectors,
        lambda: g.exact ? g.reRat : g.re
      });
    });

    var exactSum = complexSum(rawRoots);
    var exactProduct = complexProduct(rawRoots);
    var floatSum = 0;
    var floatProduct = 1;
    var floatImagProduct = 0;
    var pre = 1;
    var pim = 0;
    for (var s = 0; s < rawRoots.length; s++) {
      floatSum += rawRoots[s].re;
      var npre = pre * rawRoots[s].re - pim * rawRoots[s].im;
      var npim = pre * rawRoots[s].im + pim * rawRoots[s].re;
      pre = npre;
      pim = npim;
    }
    floatProduct = pre;
    floatImagProduct = pim;

    var sumOk;
    var productOk;
    if (exactSum && eq(exactSum, trace)) {
      lines.push(
        "Check. Sum of the eigenvalues = " + fmt(exactSum) + ", which equals the trace " + fmt(trace) + "."
      );
      sumOk = true;
    } else {
      lines.push(
        "Check. Sum of the eigenvalues is about " + fmtNum(floatSum) +
        ", and the trace is " + (exactSum ? fmt(trace) : fmt(trace)) + " (" + fmtNum(toFloat(trace)) + ")."
      );
      sumOk = Math.abs(floatSum - toFloat(trace)) <= 1e-6 * (1 + Math.abs(toFloat(trace)));
      lines.push(sumOk ? "The sum agrees with the trace at the printed precision." : "The sum does not agree with the trace. Do not trust the list.");
    }
    if (exactProduct && eq(exactProduct, det)) {
      lines.push(
        "Product of the eigenvalues = " + fmt(exactProduct) + ", which equals the determinant " + fmt(det) + "."
      );
      productOk = true;
    } else {
      lines.push(
        "Product of the eigenvalues is about " + fmtNum(floatProduct) +
        (Math.abs(floatImagProduct) > 1e-8 ? " (imaginary part " + fmtNum(floatImagProduct) + ")" : "") +
        ", and the determinant is " + fmt(det) + "."
      );
      productOk = Math.abs(floatProduct - toFloat(det)) <= 1e-6 * (1 + Math.abs(toFloat(det))) &&
        Math.abs(floatImagProduct) <= 1e-6;
      lines.push(productOk ? "The product agrees with the determinant at the printed precision." : "The product does not agree with the determinant. Do not trust the list.");
    }
    lines.push("");

    var geo = eigenspaces.reduce(function (sum, space) { return sum + space.geometric; }, 0);
    var hasComplex = groups.some(function (g) { return !g.real && Math.abs(g.im) >= 1e-8; });
    var diagonalizable = !hasComplex && geo === 3 && allVerified;
    if (hasComplex) {
      lines.push("A complex conjugate pair has no real eigenvector, so there is no basis of real eigenvectors.");
    } else if (diagonalizable) {
      lines.push("There are 3 independent eigenvectors, so A is diagonalizable.");
    } else {
      lines.push("The independent real eigenvectors number fewer than 3, so A is not diagonalizable.");
    }

    var summary = "Eigenvalues: " + englishList(labels) + ".";
    return {
      trace: trace,
      sigma: sigma,
      det: det,
      minors: minors,
      polyDet: polyDet,
      polyMonic: polyMonic,
      roots: rawRoots,
      groups: groups,
      eigenspaces: eigenspaces,
      sum: exactSum,
      product: exactProduct,
      sumOk: sumOk,
      productOk: productOk,
      diagonalizable: diagonalizable,
      summary: summary,
      lines: lines
    };
  }

  var DEFAULTS = ["2", "0", "0", "0", "3", "4", "0", "4", "9"];

  function boot() {
    var form = document.getElementById("e33-form");
    if (!form || form.getAttribute("data-e33-ready") === "1") return;
    form.setAttribute("data-e33-ready", "1");
    var errorEl = document.getElementById("e33-error");
    var resultEl = document.getElementById("e33-result");
    var amountOut = document.getElementById("e33-amount");
    var detailOut = document.getElementById("e33-detail");

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.classList.add("visible");
      resultEl.classList.remove("visible");
    }
    function clearError() {
      errorEl.classList.remove("visible");
      errorEl.textContent = "";
    }
    function readMatrix() {
      var A = [];
      for (var i = 0; i < 3; i++) {
        var row = [];
        for (var j = 0; j < 3; j++) {
          var el = document.getElementById("e33-" + i + j);
          row.push(parseEntry(el.value, "row " + (i + 1) + ", column " + (j + 1)));
        }
        A.push(row);
      }
      return A;
    }
    function run() {
      clearError();
      try {
        var solved = solve(readMatrix());
        amountOut.textContent = solved.summary;
        detailOut.textContent = solved.lines.join("\n") + "\n\nEducational use only.";
        resultEl.classList.add("visible");
      } catch (err) {
        showError(err.message || "Could not complete the calculation.");
      }
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      run();
    });
    var resetBtn = document.getElementById("e33-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        for (var k = 0; k < 9; k++) {
          var el = document.getElementById("e33-" + Math.floor(k / 3) + (k % 3));
          if (el) el.value = DEFAULTS[k];
        }
        run();
      });
    }
    run();
  }

  return {
    parseEntry: parseEntry,
    solve: solve,
    fmt: fmt,
    fmtNum: fmtNum,
    eq: eq,
    isZero: isZero,
    matVec: matVec,
    boot: boot,
    MINUS: MINUS,
    DEFAULTS: DEFAULTS
  };
});
