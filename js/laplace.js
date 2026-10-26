/* Laplace and inverse Laplace transforms for common table rows.
   Exact rational arithmetic. No libraries.
   Forward: linear combinations of t^n, e^(at), sin, cos, sinh, cosh, and products of one exponential with one of those.
   Inverse: proper rational functions whose denominators factor into rational linears and non-repeated irreducible quadratics. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LaplaceCalc = api;
  if (typeof document !== "undefined") api.boot();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MINUS = "\u2212";
  var MAX_POWER = 12;
  var MAX_DEGREE = 8;
  var MAX_INPUT = 500;

  function userError(msg) {
    var err = new Error(msg);
    err.user = true;
    return err;
  }

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
    if (d === 0n) throw userError("Division by zero.");
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    var g = gcd(n, d);
    return { n: n / g, d: d / g };
  }

  var ZERO = rat(0n, 1n);
  var ONE = rat(1n, 1n);

  function addR(a, b) { return rat(a.n * b.d + b.n * a.d, a.d * b.d); }
  function subR(a, b) { return rat(a.n * b.d - b.n * a.d, a.d * b.d); }
  function mulR(a, b) { return rat(a.n * b.n, a.d * b.d); }
  function divR(a, b) {
    if (b.n === 0n) throw userError("Division by zero.");
    return rat(a.n * b.d, a.d * b.n);
  }
  function negR(a) { return rat(-a.n, a.d); }
  function absR(a) { return a.n < 0n ? negR(a) : a; }
  function isZero(a) { return a.n === 0n; }
  function eq(a, b) { return a.n === b.n && a.d === b.d; }
  function cmp(a, b) {
    var left = a.n * b.d;
    var right = b.n * a.d;
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  }
  function cmpAbs(a, b) { return cmp(absR(a), absR(b)); }

  function fmtAbsRat(a) {
    var n = a.n < 0n ? -a.n : a.n;
    if (a.d === 1n) return n.toString();
    return n.toString() + "/" + a.d.toString();
  }
  function fmtRat(a) {
    if (a.n < 0n) return MINUS + fmtAbsRat(a);
    return fmtAbsRat(a);
  }
  function codeRat(a) {
    var sign = a.n < 0n ? "-" : "";
    var n = a.n < 0n ? -a.n : a.n;
    if (a.d === 1n) return sign + n.toString();
    return sign + n.toString() + "/" + a.d.toString();
  }

  function factorial(n) {
    var r = 1n;
    for (var i = 2; i <= n; i++) r *= BigInt(i);
    return r;
  }

  function trim(p) {
    var q = p.slice();
    while (q.length && q[q.length - 1].n === 0n) q.pop();
    return q;
  }
  function deg(p) { return p.length - 1; }
  function lead(p) { return p.length ? p[p.length - 1] : ZERO; }
  function polyEq(a, b) {
    a = trim(a);
    b = trim(b);
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (!eq(a[i], b[i])) return false;
    return true;
  }
  function polyScale(p, c) {
    if (isZero(c)) return [];
    return trim(p.map(function (coef) { return mulR(coef, c); }));
  }
  function polyAdd(a, b) {
    var n = Math.max(a.length, b.length);
    var o = [];
    for (var i = 0; i < n; i++) o.push(addR(a[i] || ZERO, b[i] || ZERO));
    return trim(o);
  }
  function polySub(a, b) { return polyAdd(a, polyScale(b, rat(-1n, 1n))); }
  function polyMul(a, b) {
    if (!a.length || !b.length) return [];
    var o = [];
    for (var i = 0; i < a.length + b.length - 1; i++) o.push(ZERO);
    for (var ia = 0; ia < a.length; ia++) {
      for (var ib = 0; ib < b.length; ib++) o[ia + ib] = addR(o[ia + ib], mulR(a[ia], b[ib]));
    }
    return trim(o);
  }
  function polyPow(p, n) {
    var result = [ONE];
    var base = p;
    var exp = n;
    while (exp > 0) {
      if (exp % 2 === 1) result = polyMul(result, base);
      exp = Math.floor(exp / 2);
      if (exp) base = polyMul(base, base);
    }
    return result;
  }
  function polyDeriv(p) {
    var o = [];
    for (var i = 1; i < p.length; i++) o.push(mulR(p[i], rat(BigInt(i), 1n)));
    return trim(o);
  }
  function polyEval(p, x) {
    var acc = ZERO;
    for (var i = p.length - 1; i >= 0; i--) acc = addR(mulR(acc, x), p[i]);
    return acc;
  }
  function polyDivMod(num, den) {
    num = trim(num);
    den = trim(den);
    if (deg(den) < 0) throw userError("Division by zero.");
    var quot = [];
    var rem = num.slice();
    var d = deg(den);
    var leadDen = den[d];
    while (deg(rem) >= d) {
      var shift = deg(rem) - d;
      var coef = divR(rem[deg(rem)], leadDen);
      while (quot.length <= shift) quot.push(ZERO);
      quot[shift] = coef;
      var subtrahend = [];
      for (var i = 0; i < shift; i++) subtrahend.push(ZERO);
      for (var j = 0; j < den.length; j++) subtrahend.push(mulR(den[j], coef));
      rem = polySub(rem, subtrahend);
    }
    return { q: trim(quot), r: trim(rem) };
  }
  function polySubst(p, a) {
    var lin = [negR(a), ONE];
    var acc = [];
    for (var i = p.length - 1; i >= 0; i--) acc = polyAdd(polyMul(acc, lin), [p[i]]);
    return trim(acc);
  }
  function monic(p) {
    p = trim(p);
    if (deg(p) < 0) return [ONE];
    var L = lead(p);
    if (eq(L, ONE)) return p;
    return polyScale(p, divR(ONE, L));
  }
  function polyGcd(a, b) {
    a = trim(a);
    b = trim(b);
    while (deg(b) >= 0) {
      var rem = polyDivMod(a, b).r;
      a = b;
      b = rem;
    }
    return monic(a);
  }
  function reduceRF(num, den) {
    num = trim(num);
    den = trim(den);
    if (deg(den) < 0) throw userError("Division by zero.");
    if (deg(num) < 0) return { num: [], den: [ONE] };
    var g = polyGcd(num, den);
    num = polyDivMod(num, g).q;
    den = polyDivMod(den, g).q;
    if (lead(den).n < 0n) {
      num = polyScale(num, rat(-1n, 1n));
      den = polyScale(den, rat(-1n, 1n));
    }
    return { num: trim(num), den: trim(den) };
  }
  function sameRF(a, b) {
    var ra = reduceRF(a.num, a.den);
    var rb = reduceRF(b.num, b.den);
    return polyEq(ra.num, rb.num) && polyEq(ra.den, rb.den);
  }
  function addRF(a, b) {
    return reduceRF(
      polyAdd(polyMul(a.num, b.den), polyMul(b.num, a.den)),
      polyMul(a.den, b.den)
    );
  }
  function scaleRF(rf, c) {
    return reduceRF(polyScale(rf.num, c), rf.den);
  }
  function derivRF(rf) {
    var np = polyDeriv(rf.num);
    var dp = polyDeriv(rf.den);
    return reduceRF(
      polySub(polyMul(np, rf.den), polyMul(rf.num, dp)),
      polyMul(rf.den, rf.den)
    );
  }
  function negDeriv(rf) {
    var d = derivRF(rf);
    return scaleRF(d, rat(-1n, 1n));
  }
  function shiftRF(rf, a) {
    return reduceRF(polySubst(rf.num, a), polySubst(rf.den, a));
  }
  function monicRF(rf) {
    var L = lead(rf.den);
    return {
      num: polyScale(rf.num, divR(ONE, L)),
      den: polyScale(rf.den, divR(ONE, L))
    };
  }

  function primitive(p) {
    p = trim(p);
    if (deg(p) < 0) return [0n];
    var lcm = 1n;
    for (var i = 0; i < p.length; i++) lcm = lcm / gcd(lcm, p[i].d) * p[i].d;
    var ints = p.map(function (c) { return c.n * (lcm / c.d); });
    var g = 0n;
    for (var j = 0; j < ints.length; j++) g = gcd(g, ints[j] < 0n ? -ints[j] : ints[j]);
    if (g === 0n) g = 1n;
    var leadSign = ints[ints.length - 1] < 0n ? -1n : 1n;
    return ints.map(function (v) { return v * leadSign / g; });
  }

  function divisors(n) {
    n = n < 0n ? -n : n;
    if (n === 0n) return [];
    var out = [];
    for (var i = 1n; i * i <= n; i++) {
      if (n % i === 0n) {
        out.push(i);
        if (i * i !== n) out.push(n / i);
      }
    }
    return out;
  }

  function sqrtRat(r) {
    if (r.n < 0n) throw userError("A square root of a negative number appeared.");
    if (r.n === 0n) return { coef: ZERO, rad: 1n };
    var inside = r.n * r.d;
    var root = 1n;
    var rad = 1n;
    var x = inside;
    var p = 2n;
    while (p * p <= x) {
      var c = 0n;
      while (x % p === 0n) {
        x /= p;
        c += 1n;
      }
      if (c) {
        root *= p ** (c / 2n);
        if (c % 2n === 1n) rad *= p;
      }
      p = p === 2n ? 3n : p + 2n;
    }
    if (x > 1n) rad *= x;
    return { coef: rat(root, r.d), rad: rad };
  }

  function ratRootCandidates(p) {
    var P = primitive(p);
    if (P.length === 1) return [];
    var constant = P[0];
    var leading = P[P.length - 1];
    if (constant === 0n) return [ZERO];
    if (constant < 0n) constant = -constant;
    if (leading < 0n) leading = -leading;
    if (constant > 100000n || leading > 100000n) {
      throw userError("A coefficient in the denominator is too large for this page to factor.");
    }
    var nums = divisors(constant);
    var dens = divisors(leading);
    var out = [];
    for (var i = 0; i < nums.length; i++) {
      for (var j = 0; j < dens.length; j++) {
        out.push(rat(nums[i], dens[j]));
        out.push(rat(-nums[i], dens[j]));
      }
    }
    return out;
  }

  function extractLinear(p, root) {
    var mult = 0;
    var factor = [negR(root), ONE];
    while (deg(p) >= 1 && isZero(polyEval(p, root))) {
      var split = polyDivMod(p, factor);
      if (deg(split.r) >= 0) break;
      p = monic(split.q);
      mult += 1;
      if (mult > MAX_DEGREE) break;
    }
    return { p: p, mult: mult };
  }

  function searchQuadratic(p) {
    var P = primitive(p);
    var n = P.length - 1;
    if (n < 4) return null;
    var constant = P[0];
    var leading = P[n];
    if (constant === 0n || leading === 0n) return null;
    var maxAbs = 0n;
    for (var i = 0; i < P.length; i++) {
      var av = P[i] < 0n ? -P[i] : P[i];
      if (av > maxAbs) maxAbs = av;
    }
    if (maxAbs > 4000n) {
      throw userError("A coefficient in the denominator is too large for this page to factor.");
    }
    var bound = maxAbs + BigInt(n) + 2n;
    if (bound > 80n) bound = 80n;
    var as = divisors(leading < 0n ? -leading : leading);
    var cs = divisors(constant < 0n ? -constant : constant);
    var ratsP = P.map(function (c) { return rat(c, 1n); });
    for (var ia = 0; ia < as.length; ia++) {
      for (var ic = 0; ic < cs.length; ic++) {
        var cands = [cs[ic], -cs[ic]];
        for (var isign = 0; isign < cands.length; isign++) {
          var cc = cands[isign];
          for (var bb = -bound; bb <= bound; bb++) {
            var q = [rat(cc, 1n), rat(bb, 1n), rat(as[ia], 1n)];
            var split = polyDivMod(ratsP, q);
            if (deg(split.r) >= 0) continue;
            if (deg(split.q) < 1) continue;
            return monic(q);
          }
        }
      }
    }
    return null;
  }

  function factorPoly(poly) {
    var p = monic(poly);
    if (deg(p) > MAX_DEGREE) {
      throw userError("The denominator has degree above " + MAX_DEGREE + ". This page stops there instead of guessing a factorization.");
    }
    var factors = [];
    while (deg(p) >= 1) {
      var roots = ratRootCandidates(p);
      var found = false;
      for (var i = 0; i < roots.length; i++) {
        if (!isZero(polyEval(p, roots[i]))) continue;
        var extracted = extractLinear(p, roots[i]);
        if (!extracted.mult) continue;
        factors.push({ kind: "lin", root: roots[i], mult: extracted.mult });
        p = extracted.p;
        found = true;
        break;
      }
      if (!found) break;
    }
    if (deg(p) <= 0) return factors;
    if (deg(p) === 1) {
      var root = divR(negR(p[0]), p[1] || ONE);
      factors.push({ kind: "lin", root: root, mult: 1 });
      return factors;
    }
    if (deg(p) === 2) {
      factors.push({ kind: "quad", poly: monic(p), mult: 1 });
      return factors;
    }
    if (deg(p) === 3) {
      throw userError("This denominator did not factor into linear factors and irreducible quadratics with rational coefficients. Split it on the partial fractions page, then enter terms such as A/(s-a), A/(s-a)^n, or (As+B)/((s-a)^2+b^2).");
    }
    var guard = 0;
    while (deg(p) >= 4 && guard < 8) {
      guard += 1;
      var quad = searchQuadratic(p);
      if (!quad) {
        throw userError("This denominator did not factor into linear factors and irreducible quadratics with rational coefficients. Split it on the partial fractions page, then enter terms such as A/(s-a), A/(s-a)^n, or (As+B)/((s-a)^2+b^2).");
      }
      var mult = 0;
      while (deg(p) >= 2) {
        var split = polyDivMod(p, quad);
        if (deg(split.r) >= 0) break;
        p = monic(split.q);
        mult += 1;
      }
      if (!mult) throw new Error("Internal check failed while factoring.");
      factors.push({ kind: "quad", poly: quad, mult: mult });
    }
    if (deg(p) > 0) factors = factors.concat(factorPoly(p));
    return factors;
  }

  function fmtPoly(p) {
    p = trim(p);
    if (deg(p) < 0) return { text: "0", terms: 0 };
    var parts = [];
    for (var i = p.length - 1; i >= 0; i--) {
      if (isZero(p[i])) continue;
      var neg = p[i].n < 0n;
      var abs = fmtAbsRat(absR(p[i]));
      var chunk;
      if (i === 0) chunk = abs;
      else {
        var s = i === 1 ? "s" : "s^" + i;
        if (abs === "1") chunk = s;
        else if (abs.indexOf("/") >= 0) chunk = "(" + abs + ")" + s;
        else chunk = abs + s;
      }
      parts.push({ neg: neg, chunk: chunk });
    }
    var text = "";
    for (var k = 0; k < parts.length; k++) {
      if (k === 0) text = (parts[k].neg ? MINUS : "") + parts[k].chunk;
      else text += parts[k].neg ? " " + MINUS + " " + parts[k].chunk : " + " + parts[k].chunk;
    }
    return { text: text, terms: parts.length };
  }

  function fmtSMinus(root) {
    if (isZero(root)) return "s";
    if (root.n > 0n) return "s " + MINUS + " " + fmtAbsRat(root);
    return "s + " + fmtAbsRat(absR(root));
  }

  function fmtLinAtom(root, mult) {
    if (isZero(root)) return mult === 1 ? "s" : "s^" + mult;
    var body = "(" + fmtSMinus(root) + ")";
    return mult === 1 ? body : body + "^" + mult;
  }

  function fmtFactorProduct(factors) {
    var ordered = factors.slice().sort(function (a, b) {
      if (a.kind !== b.kind) return a.kind === "lin" ? -1 : 1;
      if (a.kind === "lin") return -cmp(a.root, b.root);
      return 0;
    });
    var parts = ordered.map(function (f) {
      if (f.kind === "lin") return fmtLinAtom(f.root, f.mult);
      var body = fmtPoly(f.poly).text;
      var atom = "(" + body + ")";
      return f.mult === 1 ? atom : atom + "^" + f.mult;
    });
    if (parts.length === 1) return { text: parts[0], atomic: true };
    return { text: parts.join(""), atomic: false };
  }

  function slash(num, den) {
    var needs = num.terms > 1 || num.text.indexOf("/") >= 0;
    var n = needs ? "(" + num.text + ")" : num.text;
    var d = den.atomic ? den.text : "(" + den.text + ")";
    return n + "/" + d;
  }

  function fmtRF(rf) {
    var reduced = reduceRF(rf.num, rf.den);
    if (deg(reduced.num) < 0) return "0";
    if (deg(reduced.den) <= 0) {
      return fmtRat(divR(reduced.num[0], reduced.den[0] || ONE));
    }
    var mono = monicRF(reduced);
    try {
      var factors = factorPoly(mono.den);
      return slash(fmtPoly(mono.num), fmtFactorProduct(factors));
    } catch (err) {
      var expanded = fmtPoly(mono.den);
      return slash(fmtPoly(mono.num), { text: expanded.text, atomic: expanded.terms === 1 && expanded.text.charAt(0) !== MINUS && expanded.text.indexOf(" ") < 0 });
    }
  }

  function baseTrig(kind, b, a) {
    var b2 = mulR(b, b);
    var shift = [negR(a), ONE];
    var quad = polyPow(shift, 2);
    var plus = kind === "sin" || kind === "cos";
    var den = plus ? polyAdd(quad, [b2]) : polySub(quad, [b2]);
    var num = kind === "sin" || kind === "sinh" ? [b] : shift.slice();
    return reduceRF(num, den);
  }

  function transformMono(m) {
    if (isZero(m.coef)) return { num: [], den: [ONE] };
    if (!m.trig) {
      var den = polyPow([negR(m.exp), ONE], m.power + 1);
      var num = [mulR(m.coef, rat(factorial(m.power), 1n))];
      var direct = reduceRF(num, den);
      var alt = { num: [ONE], den: [ZERO, ONE] };
      for (var k = 0; k < m.power; k++) alt = negDeriv(alt);
      alt = shiftRF(alt, m.exp);
      alt = scaleRF(alt, m.coef);
      if (!sameRF(direct, alt)) throw new Error("Internal check failed for a power of t.");
      return direct;
    }
    var grown = baseTrig(m.trig.kind, m.trig.b, ZERO);
    for (var i = 0; i < m.power; i++) grown = negDeriv(grown);
    grown = shiftRF(grown, m.exp);
    var other = baseTrig(m.trig.kind, m.trig.b, m.exp);
    for (var j = 0; j < m.power; j++) other = negDeriv(other);
    if (!sameRF(grown, other)) throw new Error("Internal check failed for a sine or cosine term.");
    return scaleRF(grown, m.coef);
  }

  function fmtShiftedTrig(m) {
    var plus = m.trig.kind === "sin" || m.trig.kind === "cos";
    var b2 = mulR(m.trig.b, m.trig.b);
    var denBody;
    if (isZero(m.exp)) denBody = "s^2 " + (plus ? "+ " : MINUS + " ") + fmtAbsRat(b2);
    else denBody = fmtLinAtom(m.exp, 1) + "^2 " + (plus ? "+ " : MINUS + " ") + fmtAbsRat(b2);
    var den = { text: denBody, atomic: false };
    if (m.trig.kind === "sin" || m.trig.kind === "sinh") {
      return slash({ text: fmtRat(mulR(m.coef, m.trig.b)), terms: 1 }, den);
    }
    var lin = polyScale([negR(m.exp), ONE], m.coef);
    return slash(fmtPoly(lin), den);
  }

  function fmtMonoTransform(m) {
    if (m.trig && m.power === 0) return fmtShiftedTrig(m);
    return fmtRF(transformMono(m));
  }

  function fmtSqrtAbs(coef, rad) {
    if (rad === 1n) return fmtAbsRat(coef);
    var n = coef.n < 0n ? -coef.n : coef.n;
    var d = coef.d;
    if (n === 1n && d === 1n) return "sqrt(" + rad.toString() + ")";
    if (d === 1n) return n.toString() + " sqrt(" + rad.toString() + ")";
    if (n === 1n) return "sqrt(" + rad.toString() + ")/" + d.toString();
    return "(" + n.toString() + " sqrt(" + rad.toString() + "))/" + d.toString();
  }

  function fmtMultiplier(coef, rad) {
    if (rad === 1n && coef.d === 1n) return coef.n.toString();
    if (rad === 1n) return "(" + coef.n.toString() + "/" + coef.d.toString() + ")";
    var body = fmtSqrtAbs(coef, rad);
    if ((body.indexOf("/") >= 0 || body.indexOf(" ") >= 0) && body.charAt(0) !== "(") return "(" + body + ")";
    return body;
  }

  function fmtExp(a) {
    if (isZero(a)) return "";
    if (eq(a, ONE)) return "e^t";
    if (eq(a, rat(-1n, 1n))) return "e^(" + MINUS + "t)";
    if (a.d === 1n) {
      var n = a.n < 0n ? MINUS + (-a.n).toString() : a.n.toString();
      return "e^(" + n + "t)";
    }
    if (a.n === 1n) return "e^(t/" + a.d.toString() + ")";
    if (a.n === -1n) return "e^(" + MINUS + "t/" + a.d.toString() + ")";
    var sign = a.n < 0n ? MINUS : "";
    var absn = a.n < 0n ? -a.n : a.n;
    return "e^(" + sign + "(" + absn.toString() + "/" + a.d.toString() + ") t)";
  }

  function fmtTrigArg(freq) {
    if (freq.rad === 1n && freq.coef.d === 1n) {
      if (freq.coef.n === 1n) return "t";
      return freq.coef.n.toString() + "t";
    }
    if (freq.rad === 1n && freq.coef.n === 1n) return "t/" + freq.coef.d.toString();
    var body = fmtSqrtAbs(freq.coef, freq.rad);
    if (body.indexOf("/") >= 0) return "(" + body + ") t";
    return body + " t";
  }

  function fmtMono(m) {
    return fmtTime([{
      coef: m.coef,
      rad: 1n,
      power: m.power,
      exp: m.exp,
      kind: m.trig ? m.trig.kind : "one",
      freq: m.trig ? { coef: m.trig.b, rad: 1n } : null
    }]);
  }

  function fmtTime(terms) {
    var alive = terms.filter(function (term) { return !(isZero(term.coef) && term.rad === 1n); });
    if (!alive.length) return "0";
    var out = "";
    for (var i = 0; i < alive.length; i++) {
      var term = alive[i];
      var neg = term.coef.n < 0n;
      var coef = absR(term.coef);
      var parts = [];
      if (term.power === 1) parts.push("t");
      else if (term.power > 1) parts.push("t^" + term.power);
      var expText = fmtExp(term.exp);
      if (expText) parts.push(expText);
      if (term.kind !== "one") parts.push(term.kind + "(" + fmtTrigArg(term.freq) + ")");
      var body;
      if (!parts.length) body = fmtRat(term.rad === 1n ? term.coef : term.coef);
      else {
        var omit = term.rad === 1n && eq(coef, ONE);
        body = omit ? parts.join(" ") : fmtMultiplier(coef, term.rad) + " " + parts.join(" ");
        if (!term.rad || term.rad === 1n) {
          /* coef sign is applied by the joiner */
        }
      }
      if (!parts.length) {
        body = term.rad === 1n ? fmtAbsRat(coef) : fmtMultiplier(coef, term.rad);
        if (term.rad === 1n && coef.d !== 1n) body = fmtAbsRat(coef);
      }
      if (i === 0) out = (neg ? MINUS : "") + body;
      else out += neg ? " " + MINUS + " " + body : " + " + body;
    }
    return out;
  }

  function timeSignature(terms) {
    return terms.map(function (term) {
      return [
        codeRat(term.coef),
        term.rad.toString(),
        String(term.power),
        codeRat(term.exp),
        term.kind,
        term.freq ? codeRat(term.freq.coef) : "",
        term.freq ? term.freq.rad.toString() : ""
      ].join(":");
    }).join(";");
  }

  function mono(coef, power, exp, trig) {
    return {
      coef: coef,
      power: power || 0,
      exp: exp || ZERO,
      trig: trig || null
    };
  }

  function scaleMono(m, c) {
    return mono(mulR(m.coef, c), m.power, m.exp, m.trig);
  }

  function mulMono(a, b) {
    if (a.trig && b.trig) {
      throw userError("A product of two trig or hyperbolic functions is not in the table this page uses. Rewrite it with a product-to-sum identity, then enter the result.");
    }
    return mono(mulR(a.coef, b.coef), a.power + b.power, addR(a.exp, b.exp), a.trig || b.trig);
  }

  function collect(list) {
    var out = [];
    list.forEach(function (m) {
      if (m.power > MAX_POWER) {
        throw userError("Powers of t above " + MAX_POWER + " are past the factorial table this page expands.");
      }
      if (isZero(m.coef)) return;
      for (var i = 0; i < out.length; i++) {
        var ex = out[i];
        if (ex.power === m.power && eq(ex.exp, m.exp) && sameTrig(ex.trig, m.trig)) {
          ex.coef = addR(ex.coef, m.coef);
          return;
        }
      }
      out.push(mono(m.coef, m.power, m.exp, m.trig));
    });
    return out.filter(function (m) { return !isZero(m.coef); });
  }

  function sameTrig(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.kind === b.kind && eq(a.b, b.b);
  }

  function isConstantList(list) {
    return list.length === 0 || (list.length === 1 && list[0].power === 0 && isZero(list[0].exp) && !list[0].trig);
  }

  var REJECT_NAME = {
    ln: "Natural logs are not in the elementary Laplace table this page uses.",
    log: "Logarithms are not in the elementary Laplace table this page uses.",
    tan: "Tangent is not in the table this page uses.",
    cot: "Cotangent is not in the table this page uses.",
    sec: "Secant is not in the table this page uses.",
    csc: "Cosecant is not in the table this page uses.",
    sqrt: "Square roots of t are not in the table this page uses.",
    pi: "pi is not a rational coefficient. Enter a fraction such as 1/2.",
    u: "Unit steps are not in this calculator. Enter the formula that holds for t greater than 0, without a step function.",
    heaviside: "Unit steps are not in this calculator. Enter the formula that holds for t greater than 0, without a step function.",
    unitstep: "Unit steps are not in this calculator.",
    step: "Unit steps are not in this calculator.",
    delta: "Impulses are not in this calculator.",
    dirac: "Impulses are not in this calculator.",
    abs: "Absolute value is not in the table this page uses."
  };

  function normalize(src) {
    return String(src)
      .replace(/\u00b2/g, "^2")
      .replace(/\u00b3/g, "^3")
      .replace(/\u2070/g, "^0")
      .replace(/\u00b9/g, "^1")
      .replace(/\u2074/g, "^4")
      .replace(/\u2075/g, "^5")
      .replace(/\u2076/g, "^6")
      .replace(/\u2077/g, "^7")
      .replace(/\u2078/g, "^8")
      .replace(/\u2079/g, "^9")
      .replace(/[\u2212\u2013\u2014]/g, "-")
      .replace(/[\u00d7\u22c5\u00b7]/g, "*")
      .replace(/[{]/g, "(")
      .replace(/[}]/g, ")")
      .replace(/\*\*/g, "^");
  }

  function tokenize(raw) {
    var src = normalize(raw);
    if (src.length > MAX_INPUT) throw userError("That input is too long for this page.");
    var tokens = [];
    var i = 0;
    while (i < src.length) {
      var ch = src.charAt(i);
      if (/\s/.test(ch)) {
        i += 1;
        continue;
      }
      if ("+-*/^()".indexOf(ch) >= 0) {
        tokens.push({ k: "op", v: ch });
        i += 1;
        continue;
      }
      if (/[0-9.]/.test(ch)) {
        var start = i;
        i += 1;
        while (i < src.length && /[0-9.]/.test(src.charAt(i))) i += 1;
        var text = src.slice(start, i);
        if (text.indexOf(".") !== text.lastIndexOf(".")) throw userError("Could not read the number " + text + ".");
        if (text.charAt(0) === ".") text = "0" + text;
        if (text.charAt(text.length - 1) === ".") text = text.slice(0, -1);
        var dot = text.indexOf(".");
        if (dot < 0) tokens.push({ k: "n", v: rat(BigInt(text), 1n) });
        else {
          var digits = text.replace(".", "");
          var den = 10n ** BigInt(text.length - dot - 1);
          tokens.push({ k: "n", v: rat(BigInt(digits), den) });
        }
        continue;
      }
      if (/[A-Za-z]/.test(ch)) {
        var idStart = i;
        i += 1;
        while (i < src.length && /[A-Za-z]/.test(src.charAt(i))) i += 1;
        tokens.push({ k: "id", v: src.slice(idStart, i).toLowerCase() });
        continue;
      }
      throw userError("This page cannot read the character \"" + ch + "\".");
    }
    return tokens;
  }

  function parse(input, mode) {
    var tokens = tokenize(input);
    if (!tokens.length) {
      throw userError(mode === "inverse"
        ? "Enter a transform F(s). Inverse mode expects a function of s."
        : "Enter a function f(t). Forward mode expects a function of t.");
    }
    var i = 0;
    function peek() { return tokens[i]; }
    function next() { return tokens[i++]; }
    function expect(op) {
      var tok = next();
      if (!tok || tok.k !== "op" || tok.v !== op) throw userError("Missing a \"" + op + "\".");
    }
    function parseExpr() {
      var node = parseTerm();
      while (peek() && peek().k === "op" && (peek().v === "+" || peek().v === "-")) {
        var op = next().v;
        node = { t: "bin", op: op, l: node, r: parseTerm() };
      }
      return node;
    }
    function parseTerm() {
      var node = parseUnary();
      while (peek()) {
        var p = peek();
        if (p.k === "op" && (p.v === "*" || p.v === "/")) {
          var op = next().v;
          node = { t: "bin", op: op, l: node, r: parseUnary() };
          continue;
        }
        if (p.k === "n" || p.k === "id" || (p.k === "op" && p.v === "(")) {
          node = { t: "bin", op: "*", l: node, r: parseUnary() };
          continue;
        }
        break;
      }
      return node;
    }
    function parseUnary() {
      if (peek() && peek().k === "op" && peek().v === "+") {
        next();
        return parseUnary();
      }
      if (peek() && peek().k === "op" && peek().v === "-") {
        next();
        return { t: "bin", op: "*", l: { t: "num", v: rat(-1n, 1n) }, r: parseUnary() };
      }
      return parsePow();
    }
    function parsePow() {
      var base = parsePrimary();
      if (peek() && peek().k === "op" && peek().v === "^") {
        next();
        return { t: "bin", op: "^", l: base, r: parseUnary() };
      }
      return base;
    }
    function parseExpArg() {
      if (peek() && peek().k === "op" && peek().v === "(") {
        next();
        var inside = parseExpr();
        expect(")");
        return inside;
      }
      var sign = 1n;
      if (peek() && peek().k === "op" && peek().v === "-") {
        next();
        sign = -1n;
      }
      var coef = ONE;
      if (peek() && peek().k === "n") coef = mulR(next().v, rat(sign, 1n));
      else coef = rat(sign, 1n);
      if (peek() && peek().k === "id" && (peek().v === "t" || peek().v === "s")) {
        var name = next().v;
        return { t: "bin", op: "*", l: { t: "num", v: coef }, r: { t: "var", name: name } };
      }
      if (sign === 1n && eq(coef, ONE)) throw userError("Write the exponential as e^(at) or exp(at). e^2t means e^(2t).");
      throw userError("e raised to a bare constant is not a rational coefficient. Use e^(at), with no added constant in the exponent.");
    }
    function parseLooseArg() {
      var sign = ONE;
      if (peek() && peek().k === "op" && peek().v === "-") {
        next();
        sign = rat(-1n, 1n);
      }
      var coef = null;
      if (peek() && peek().k === "n") coef = next().v;
      var variable = null;
      if (peek() && peek().k === "id" && (peek().v === "t" || peek().v === "s")) {
        variable = { t: "var", name: next().v };
        if (peek() && peek().k === "op" && peek().v === "^") {
          next();
          if (!peek() || peek().k !== "n" || peek().v.d !== 1n) throw userError("Put parentheses around that power.");
          var exp = Number(next().v.n);
          variable = { t: "bin", op: "^", l: variable, r: { t: "num", v: rat(BigInt(exp), 1n) } };
        }
      }
      if (!coef && !variable) throw userError("Put parentheses around the function argument.");
      var node = variable || { t: "num", v: coef };
      if (coef && variable) node = { t: "bin", op: "*", l: { t: "num", v: coef }, r: variable };
      if (!eq(sign, ONE)) node = { t: "bin", op: "*", l: { t: "num", v: sign }, r: node };
      return node;
    }
    function parsePrimary() {
      var p = peek();
      if (!p) throw userError("The expression ended early.");
      if (p.k === "op" && p.v === "(") {
        next();
        var inner = parseExpr();
        expect(")");
        return inner;
      }
      if (p.k === "n") {
        next();
        return { t: "num", v: p.v };
      }
      if (p.k === "id") {
        next();
        var name = p.v;
        if (REJECT_NAME[name]) throw userError(REJECT_NAME[name]);
        if (name === "e") {
          if (!(peek() && peek().k === "op" && peek().v === "^")) {
            throw userError("Write the exponential as e^(at) or exp(at).");
          }
          next();
          return { t: "call", name: "exp", arg: parseExpArg() };
        }
        if (name === "exp" || name === "sin" || name === "cos" || name === "sinh" || name === "cosh") {
          var arg;
          if (peek() && peek().k === "op" && peek().v === "(") {
            next();
            arg = parseExpr();
            expect(")");
          } else arg = parseLooseArg();
          return { t: "call", name: name, arg: arg };
        }
        if (name === "t" || name === "s" || name === "x" || name === "y") return { t: "var", name: name };
        throw userError("This page does not know the name " + name + ". Supported pieces are powers of t, e^(at), sin, cos, sinh, and cosh.");
      }
      throw userError("Could not read the expression near \"" + (p.v || "") + "\".");
    }
    var tree = parseExpr();
    if (i < tokens.length) throw userError("Could not read the rest of the expression.");
    return tree;
  }

  function evalInverseNode(node) {
    if (node.t === "num") return { num: [node.v], den: [ONE] };
    if (node.t === "var") {
      if (node.name === "t" || node.name === "x") {
        throw userError("Inverse mode expects a function of s. A formula in t belongs in forward mode.");
      }
      if (node.name !== "s") throw userError("The transform variable on this page is s.");
      return { num: [ZERO, ONE], den: [ONE] };
    }
    if (node.t === "call") {
      throw userError("Inverse mode expects a rational function of s, not " + node.name + ". Switch to forward if this is a function of t.");
    }
    var L = evalInverseNode(node.l);
    var R = evalInverseNode(node.r);
    if (node.op === "+") return addRF(L, R);
    if (node.op === "-") return addRF(L, scaleRF(R, rat(-1n, 1n)));
    if (node.op === "*") return reduceRF(polyMul(L.num, R.num), polyMul(L.den, R.den));
    if (node.op === "/") return reduceRF(polyMul(L.num, R.den), polyMul(L.den, R.num));
    if (node.op === "^") {
      if (deg(R.den) > 0 || deg(R.num) > 0) throw userError("Exponents in inverse mode must be integers.");
      var c = deg(R.num) < 0 ? ZERO : divR(R.num[0], R.den[0] || ONE);
      if (c.d !== 1n) throw userError("Exponents in inverse mode must be integers.");
      var exp = Number(c.n);
      if (!Number.isSafeInteger(exp) || Math.abs(exp) > MAX_DEGREE + 2) {
        throw userError("That exponent is too large for this page.");
      }
      if (exp === 0) return { num: [ONE], den: [ONE] };
      var base = L;
      if (exp < 0) {
        base = reduceRF(L.den, L.num);
        exp = -exp;
      }
      return reduceRF(polyPow(base.num, exp), polyPow(base.den, exp));
    }
    throw userError("Could not read that operation.");
  }

  function asLinear(node, expandFn) {
    var list = collect(expandFn(node));
    var a = ZERO;
    var b = ZERO;
    list.forEach(function (m) {
      if (m.trig || !isZero(m.exp) || m.power > 1) {
        throw userError("That argument must be a linear function of t, such as 3t or -2t, not a product or a higher power.");
      }
      if (m.power === 0) b = addR(b, m.coef);
      else a = addR(a, m.coef);
    });
    return { a: a, b: b };
  }

  function expand(node) {
    if (node.t === "num") return [mono(node.v, 0, ZERO, null)];
    if (node.t === "var") {
      if (node.name === "s") throw userError("Forward mode uses t as time. s belongs in inverse mode.");
      if (node.name !== "t") {
        throw userError("The time variable is t. Replace " + node.name + " with t.");
      }
      return [mono(ONE, 1, ZERO, null)];
    }
    if (node.t === "call") {
      if (node.name === "exp") return expandExp(node.arg);
      return expandTrig(node.name, node.arg);
    }
    if (node.op === "+") return expand(node.l).concat(expand(node.r));
    if (node.op === "-") return expand(node.l).concat(expand(node.r).map(function (m) { return scaleMono(m, rat(-1n, 1n)); }));
    if (node.op === "*") {
      var left = collect(expand(node.l));
      var right = collect(expand(node.r));
      var prod = [];
      for (var i = 0; i < left.length; i++) {
        for (var j = 0; j < right.length; j++) prod.push(mulMono(left[i], right[j]));
      }
      return prod;
    }
    if (node.op === "/") {
      var den = collect(expand(node.r));
      if (!isConstantList(den)) {
        if (den.some(function (m) { return m.power > 0 && !m.trig && isZero(m.exp); })) {
          throw userError("Division by t, including 1/t, is outside the elementary Laplace table on this page.");
        }
        throw userError("Only division by a rational constant is supported in forward mode. Rewrite other quotients before you enter them.");
      }
      var c = den.length ? den[0].coef : ZERO;
      if (isZero(c)) throw userError("Division by zero.");
      return expand(node.l).map(function (m) { return scaleMono(m, divR(ONE, c)); });
    }
    if (node.op === "^") {
      var expList = collect(expand(node.r));
      if (!isConstantList(expList)) throw userError("Exponents must be integers.");
      var expRat = expList.length ? expList[0].coef : ZERO;
      if (expRat.d !== 1n || expRat.n > BigInt(MAX_POWER) || expRat.n < -BigInt(MAX_POWER)) {
        throw userError("Exponents must be integers between -" + MAX_POWER + " and " + MAX_POWER + ".");
      }
      var exp = Number(expRat.n);
      var base = collect(expand(node.l));
      if (exp < 0) {
        if (!isConstantList(base)) {
          throw userError("Negative powers of t, including 1/t, are outside the elementary Laplace table on this page.");
        }
        var baseC = base.length ? base[0].coef : ZERO;
        if (isZero(baseC)) throw userError("Division by zero.");
        var inv = ONE;
        for (var n = 0; n < -exp; n++) inv = divR(inv, baseC);
        return [mono(inv, 0, ZERO, null)];
      }
      if (exp === 0) {
        if (isConstantList(base) && base.length === 1 && isZero(base[0].coef)) throw userError("Zero to the power zero is undefined here.");
        return [mono(ONE, 0, ZERO, null)];
      }
      var acc = [mono(ONE, 0, ZERO, null)];
      for (var p = 0; p < exp; p++) {
        var nextAcc = [];
        for (var a = 0; a < acc.length; a++) {
          for (var b = 0; b < base.length; b++) nextAcc.push(mulMono(acc[a], base[b]));
        }
        acc = collect(nextAcc);
      }
      return acc;
    }
    throw userError("Could not read that operation.");
  }

  function expandExp(arg) {
    var lin = asLinear(arg, expand);
    if (!isZero(lin.b)) {
      throw userError("The exponent has a constant term. e^(2t+1) equals e times e^(2t), and e is not a rational coefficient. Leave the added constant out.");
    }
    if (isZero(lin.a)) return [mono(ONE, 0, ZERO, null)];
    return [mono(ONE, 0, lin.a, null)];
  }

  function expandTrig(name, arg) {
    var lin = asLinear(arg, expand);
    if (!isZero(lin.b)) {
      if (isZero(lin.a)) return constTrig(name, lin.b);
      throw userError("A phase shift such as sin(2t+1) is not in the table this page applies. Use an angle-addition formula, then enter the sine and cosine terms separately.");
    }
    if (isZero(lin.a)) return constTrig(name, ZERO);
    var b = lin.a;
    var sign = ONE;
    var odd = name === "sin" || name === "sinh";
    if (b.n < 0n) {
      b = negR(b);
      if (odd) sign = rat(-1n, 1n);
    }
    return [mono(sign, 0, ZERO, { kind: name, b: b })];
  }

  function constTrig(name, c) {
    if (!isZero(c)) {
      throw userError(name + " of a nonzero constant is not a rational coefficient this page can use.");
    }
    if (name === "sin" || name === "sinh") return [];
    return [mono(ONE, 0, ZERO, null)];
  }

  function joinFormulas(parts) {
    var out = "";
    parts.forEach(function (part, idx) {
      var neg = part.charAt(0) === MINUS;
      var body = neg ? part.slice(1) : part;
      if (idx === 0) out = part;
      else out += neg ? " " + MINUS + " " + body : " + " + part;
    });
    return out || "0";
  }

  function stepsForMono(m) {
    var lines = [];
    lines.push("Term " + fmtMono(m) + ".");
    if (!(eq(m.coef, ONE) || eq(m.coef, rat(-1n, 1n)))) {
      lines.push("Linearity. The constant " + fmtRat(m.coef) + " comes out of the integral and multiplies the transform at the end.");
    } else if (m.coef.n < 0n) {
      lines.push("Linearity. The minus sign stays in front of this term's transform.");
    }
    if (!isZero(m.exp)) {
      lines.push("First shift theorem. L{e^(at) f(t)} = F(s " + MINUS + " a) with a = " + fmtRat(m.exp) + ". Transform f, then replace s by s " + MINUS + " (" + fmtRat(m.exp) + ").");
    }
    if (!m.trig && m.power === 0 && isZero(m.exp)) {
      lines.push("Table rule. The constant function 1 has transform 1/s.");
    } else if (!m.trig) {
      lines.push("Table rule. L{t^n} = n!/s^(n+1) for a nonnegative integer n. Here n = " + m.power + " and n! = " + factorial(m.power).toString() + ".");
      if (!isZero(m.exp)) lines.push("After the shift, that denominator is (s " + MINUS + " a)^(n+1).");
    } else if (m.power === 0) {
      var ruleName = {
        sin: "L{sin(bt)} = b/(s^2 + b^2)",
        cos: "L{cos(bt)} = s/(s^2 + b^2)",
        sinh: "L{sinh(bt)} = b/(s^2 " + MINUS + " b^2)",
        cosh: "L{cosh(bt)} = s/(s^2 " + MINUS + " b^2)"
      }[m.trig.kind];
      lines.push("Table rule. " + ruleName + ", with b = " + fmtRat(m.trig.b) + ".");
    } else {
      lines.push("Table rule for " + m.trig.kind + "(bt) with b = " + fmtRat(m.trig.b) + ", then the multiplication-by-t rule.");
      var rf = baseTrig(m.trig.kind, m.trig.b, ZERO);
      lines.push("L{" + m.trig.kind + "(" + (eq(m.trig.b, ONE) ? "t" : fmtAbsRat(m.trig.b) + "t") + ")} = " + fmtRF(rf) + ".");
      var shown = m.power <= 3 ? m.power : 3;
      for (var k = 1; k <= shown; k++) {
        rf = negDeriv(rf);
        lines.push("Multiply by t, step " + k + ". L{t f(t)} = " + MINUS + "d/ds F(s), which gives " + fmtRF(rf) + ".");
      }
      if (m.power > 3) lines.push("The same rule is applied " + m.power + " times in all.");
      if (!isZero(m.exp)) lines.push("The shift is applied after those derivatives.");
    }
    lines.push("This term transforms to " + fmtMonoTransform(m) + ".");
    return lines;
  }

  function forward(input) {
    var rawCount;
    var monos;
    try {
      var expanded = expand(parse(input, "forward"));
      rawCount = collect(expanded).length;
      monos = collect(expanded);
    } catch (err) {
      throw err;
    }
    if (monos.length > 24) throw userError("That sum has too many terms for this page.");
    if (!monos.length) {
      return {
        answer: "0",
        pieces: ["0"],
        steps: ["The expression simplifies to the zero function. Its Laplace transform is 0."],
        rational: { num: [], den: [ONE] },
        valueAt: function () { return 0; }
      };
    }
    var steps = [];
    if (rawCount !== monos.length) steps.push("Like terms were collected before the table was applied.");
    if (monos.length > 1) {
      steps.push("Linearity. The transform of a sum is the sum of the transforms.");
    }
    var pieces = [];
    var total = null;
    monos.forEach(function (m, idx) {
      if (idx) steps.push("");
      steps = steps.concat(stepsForMono(m));
      var piece = fmtMonoTransform(m);
      pieces.push(piece);
      var rf = transformMono(m);
      total = total ? addRF(total, rf) : rf;
    });
    var combined = fmtRF(total);
    var answer = monos.length === 1 ? pieces[0] : combined;
    if (monos.length > 1) {
      steps.push("");
      steps.push("Add the transforms.");
      steps.push(joinFormulas(pieces) + " = " + combined + ".");
    }
    steps.push("");
    steps.push("These formulas hold for s whose real part is large enough that the integral from 0 to infinity of e^(−st) f(t) dt converges. For a term that grows like e^(at), that means the real part of s is greater than a.");
    return {
      answer: answer,
      pieces: pieces,
      combined: combined,
      steps: steps,
      rational: total,
      valueAt: function (s) { return evalRF(total, s); }
    };
  }

  function evalRF(rf, s) {
    function ev(p, x) {
      var acc = 0;
      for (var i = p.length - 1; i >= 0; i--) acc = acc * x + Number(p[i].n) / Number(p[i].d);
      return acc;
    }
    var den = ev(rf.den, s);
    if (!den) return NaN;
    return ev(rf.num, s) / den;
  }

  function pushTime(list, term) {
    if (isZero(term.coef)) return;
    for (var i = 0; i < list.length; i++) {
      var ex = list[i];
      if (ex.power === term.power && ex.kind === term.kind && ex.rad === term.rad && eq(ex.exp, term.exp) && sameFreq(ex.freq, term.freq)) {
        ex.coef = addR(ex.coef, term.coef);
        return;
      }
    }
    list.push({
      coef: term.coef,
      rad: term.rad,
      power: term.power,
      exp: term.exp,
      kind: term.kind,
      freq: term.freq
    });
  }

  function sameFreq(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.rad === b.rad && eq(a.coef, b.coef);
  }

  function maybeHyperbolic(terms) {
    if (terms.length !== 2) return { terms: terms, note: "" };
    if (terms[0].kind !== "one" || terms[1].kind !== "one") return { terms: terms, note: "" };
    if (terms[0].power || terms[1].power || terms[0].rad !== 1n || terms[1].rad !== 1n) return { terms: terms, note: "" };
    var first = terms[0];
    var second = terms[1];
    if (cmp(first.exp, second.exp) < 0) {
      var swap = first;
      first = second;
      second = swap;
    }
    if (eq(first.exp, second.exp)) return { terms: terms, note: "" };
    var a = divR(addR(first.exp, second.exp), rat(2n, 1n));
    var b = divR(subR(first.exp, second.exp), rat(2n, 1n));
    if (b.n <= 0n) return { terms: terms, note: "" };
    var coshCoef = addR(first.coef, second.coef);
    var sinhCoef = subR(first.coef, second.coef);
    if (isZero(coshCoef) && !isZero(sinhCoef)) {
      var sinhTerm = { coef: sinhCoef, rad: 1n, power: 0, exp: a, kind: "sinh", freq: { coef: b, rad: 1n } };
      return {
        terms: [sinhTerm],
        note: "The two exponentials are a hyperbolic sine. " + fmtTime(terms) + " = " + fmtTime([sinhTerm]) + "."
      };
    }
    if (isZero(sinhCoef) && !isZero(coshCoef)) {
      var coshTerm = { coef: coshCoef, rad: 1n, power: 0, exp: a, kind: "cosh", freq: { coef: b, rad: 1n } };
      return {
        terms: [coshTerm],
        note: "The two exponentials are a hyperbolic cosine. " + fmtTime(terms) + " = " + fmtTime([coshTerm]) + "."
      };
    }
    return { terms: terms, note: "" };
  }

  function invertLinear(root, mult, values, lines) {
    var terms = [];
    for (var k = 1; k <= mult; k++) {
      var A = values[k - 1];
      if (isZero(A)) continue;
      var denomPow = k === 1 ? fmtLinAtom(root, 1) : fmtLinAtom(root, k);
      lines.push("The term " + fmtRat(A) + "/" + (denomPow.charAt(0) === "s" && denomPow.indexOf("(") < 0 ? denomPow : "(" + denomPow + ")") + " uses L{t^(n) e^(at)} = n!/(s " + MINUS + " a)^(n+1), with n = " + (k - 1) + ".");
      var coef = divR(A, rat(factorial(k - 1), 1n));
      lines.push("Divide the numerator by " + (k - 1 === 0 ? "0! = 1" : (k - 1) + "! = " + factorial(k - 1).toString()) + ". That coefficient is " + fmtRat(coef) + ".");
      terms.push({ coef: coef, rad: 1n, power: k - 1, exp: root, kind: "one", freq: null });
    }
    return terms;
  }

  function invertQuadratic(poly, B, C, lines) {
    var p = poly[1] || ZERO;
    var c = poly[0] || ZERO;
    var a = divR(negR(p), rat(2n, 1n));
    var half = divR(p, rat(2n, 1n));
    var constant = subR(c, mulR(half, half));
    if (isZero(constant)) {
      throw userError("A quadratic factor was a repeated linear factor in disguise. Enter it as a power of (s " + MINUS + " a).");
    }
    var hyperbolic = constant.n < 0n;
    var bInfo = sqrtRat(absR(constant));
    lines.push("Complete the square. " + fmtPoly(poly).text + " = (" + fmtSMinus(a) + ")^2 " + (hyperbolic ? MINUS + " " : "+ ") + fmtAbsRat(absR(constant)) + ".");
    var shifted = addR(C, mulR(B, a));
    lines.push("Rewrite the numerator " + fmtPoly(trim([C, B])).text + " as " + fmtRat(B) + "(" + fmtSMinus(a) + ") + (" + fmtRat(shifted) + ").");
    var kindCos = hyperbolic ? "cosh" : "cos";
    var kindSin = hyperbolic ? "sinh" : "sin";
    var terms = [];
    if (!isZero(B)) {
      lines.push("The " + kindCos + " table row supplies the (" + fmtSMinus(a) + ") piece. Its coefficient is " + fmtRat(B) + ".");
      terms.push({ coef: B, rad: 1n, power: 0, exp: a, kind: kindCos, freq: bInfo });
    }
    if (!isZero(shifted)) {
      var sinCoef = isZero(bInfo.coef) ? null : divBySqrt(shifted, bInfo);
      lines.push("The " + kindSin + " table row has b in the numerator. Divide the leftover " + fmtRat(shifted) + " by b = " + fmtSqrtSigned(bInfo) + ". The coefficient is " + fmtSqrtSigned(sinCoef) + ".");
      terms.push({ coef: sinCoef.coef, rad: sinCoef.rad, power: 0, exp: a, kind: kindSin, freq: bInfo });
    }
    return terms;
  }

  function divBySqrt(q, srt) {
    if (srt.rad === 1n) return { coef: divR(q, srt.coef), rad: 1n };
    var scale = divR(q, mulR(srt.coef, rat(srt.rad, 1n)));
    return { coef: scale, rad: srt.rad };
  }

  function fmtSqrtSigned(info) {
    if (!info) return "0";
    var body = fmtSqrtAbs(absR(info.coef), info.rad);
    return info.coef.n < 0n ? MINUS + body : body;
  }

  function solveSystem(rows, rhs) {
    var n = rows.length;
    var m = rows.map(function (row, idx) { return row.concat([rhs[idx]]); });
    for (var col = 0; col < n; col++) {
      var pivot = col;
      for (var r = col + 1; r < n; r++) {
        if (cmpAbs(m[r][col], m[pivot][col]) > 0) pivot = r;
      }
      if (isZero(m[pivot][col])) throw new Error("Internal check failed: the partial-fraction system was singular.");
      if (pivot !== col) {
        var tmp = m[pivot];
        m[pivot] = m[col];
        m[col] = tmp;
      }
      var piv = m[col][col];
      for (var j = col; j <= n; j++) m[col][j] = divR(m[col][j], piv);
      for (var rr = 0; rr < n; rr++) {
        if (rr === col || isZero(m[rr][col])) continue;
        var factor = m[rr][col];
        for (var jj = col; jj <= n; jj++) m[rr][jj] = subR(m[rr][jj], mulR(factor, m[col][jj]));
      }
    }
    return m.map(function (row) { return row[n]; });
  }

  function inverse(input) {
    var rf = evalInverseNode(parse(input, "inverse"));
    rf = reduceRF(rf.num, rf.den);
    if (deg(rf.num) < 0) {
      return {
        answer: "0",
        steps: ["The expression simplifies to 0. The inverse Laplace transform is the zero function."],
        terms: [],
        signature: ""
      };
    }
    if (deg(rf.den) <= 0) {
      throw userError("A polynomial in s, including a nonzero constant, is the transform of an impulse or a derivative of an impulse. This page does not invert those.");
    }
    if (deg(rf.num) >= deg(rf.den)) {
      throw userError("This fraction is improper: the numerator is not of lower degree than the denominator. Divide first. The polynomial quotient is an impulse term, which this page does not invert. Enter the proper fraction that remains.");
    }
    var monoDen = monicRF(rf);
    var factors = factorPoly(monoDen.den);
    factors.forEach(function (f) {
      if (f.kind === "quad" && f.mult > 1) {
        throw userError("A repeated quadratic factor is outside this inverse calculator. The inverse needs a factor of t in front of sine or cosine. Repeated linear factors, and quadratics that appear once, are supported.");
      }
    });
    factors.sort(function (a, b) {
      if (a.kind !== b.kind) return a.kind === "lin" ? -1 : 1;
      if (a.kind === "lin" && b.kind === "lin") return -cmp(a.root, b.root);
      return 0;
    });
    var lines = [];
    lines.push("Combine the input into one fraction: " + fmtRF(monoDen) + ".");
    lines.push("The fraction is proper, so no polynomial division is required.");
    var factorText = fmtFactorProduct(factors).text;
    lines.push("Factor the denominator as " + factorText + ".");
    var unknowns = [];
    factors.forEach(function (f, idx) {
      if (f.kind === "lin") {
        for (var k = 1; k <= f.mult; k++) {
          unknowns.push({ factor: idx, k: k, kind: "lin" });
        }
      } else {
        unknowns.push({ factor: idx, kind: "s" });
        unknowns.push({ factor: idx, kind: "c" });
      }
    });
    var degree = deg(monoDen.den);
    if (unknowns.length !== degree) throw new Error("Internal check failed: partial fractions lost a coefficient.");
    function cofactor(exclude) {
      var prod = [ONE];
      factors.forEach(function (f, idx) {
        var base = f.kind === "lin" ? [negR(f.root), ONE] : f.poly;
        var power = f.mult;
        if (idx === exclude.factor) {
          if (exclude.kind === "lin") power = f.mult - exclude.k;
          else power = f.mult - 1;
        }
        if (power > 0) prod = polyMul(prod, polyPow(base, power));
      });
      if (exclude.kind === "s") prod = polyMul(prod, [ZERO, ONE]);
      return prod;
    }
    var columns = unknowns.map(function (u) { return coefVector(cofactor(u), degree); });
    var rhs = coefVector(monoDen.num, degree);
    var rows = [];
    for (var r = 0; r < degree; r++) {
      var row = [];
      for (var c = 0; c < columns.length; c++) row.push(columns[c][r]);
      rows.push(row);
    }
    var solved = solveSystem(rows, rhs);
    lines.push("Partial fractions. Equating numerators produces a square linear system, one unknown for each degree in the denominator.");
    var grouped = factors.map(function () { return []; });
    solved.forEach(function (value, idx) {
      var u = unknowns[idx];
      grouped[u.factor].push(value);
      if (u.kind === "lin") {
        lines.push("Coefficient of 1/" + fmtLinAtom(factors[u.factor].root, u.k) + " is " + fmtRat(value) + ".");
      } else if (u.kind === "s") {
        lines.push("Coefficient of s / " + fmtPoly(factors[u.factor].poly).text + " is " + fmtRat(value) + ".");
      } else {
        lines.push("Constant numerator over " + fmtPoly(factors[u.factor].poly).text + " is " + fmtRat(value) + ".");
      }
    });
    if (factors.every(function (f) { return f.kind === "lin" && f.mult === 1; })) {
      lines.push("Simple poles, so cover-up agrees with that system. At a root r, the coefficient is the numerator divided by the product of (r minus the other roots).");
      factors.forEach(function (f, idx) {
        var others = [ONE];
        factors.forEach(function (g, jdx) {
          if (jdx === idx) return;
          others = polyMul(others, [negR(g.root), ONE]);
        });
        var cover = divR(polyEval(monoDen.num, f.root), polyEval(others, f.root));
        if (!eq(cover, grouped[idx][0])) throw new Error("Internal check failed: cover-up disagreed with the linear system.");
        lines.push("At s = " + fmtRat(f.root) + ", the coefficient is " + fmtRat(cover) + ".");
      });
    }
    var timeTerms = [];
    factors.forEach(function (f, idx) {
      lines.push("");
      if (f.kind === "lin") {
        invertLinear(f.root, f.mult, grouped[idx], lines).forEach(function (term) { pushTime(timeTerms, term); });
      } else {
        var produced = invertQuadratic(f.poly, grouped[idx][0], grouped[idx][1], lines);
        produced.forEach(function (term) { pushTime(timeTerms, term); });
      }
    });
    timeTerms = timeTerms.filter(function (term) { return !isZero(term.coef); });
    var partialText = fmtTime(timeTerms);
    var rewritten = maybeHyperbolic(timeTerms);
    if (rewritten.note) {
      lines.push("");
      lines.push(rewritten.note);
    }
    lines.push("");
    lines.push("Inverse Laplace transform: " + fmtTime(rewritten.terms) + ".");
    lines.push("The same identity can be checked by transforming the answer forward, for every term this page knows.");
    return {
      answer: fmtTime(rewritten.terms),
      partial: partialText,
      steps: lines,
      terms: rewritten.terms,
      signature: timeSignature(rewritten.terms),
      rational: monoDen
    };
  }

  function coefVector(p, degree) {
    var o = [];
    for (var i = 0; i < degree; i++) o.push(p[i] || ZERO);
    if (deg(p) >= degree) throw new Error("Internal check failed: a numerator was too tall.");
    return o;
  }

  function compute(input, mode) {
    try {
      var result = mode === "inverse" ? inverse(input) : forward(input);
      result.ok = true;
      result.mode = mode === "inverse" ? "inverse" : "forward";
      return result;
    } catch (err) {
      return {
        ok: false,
        error: err && err.user ? err.message : "This page stopped because an internal check failed. No answer is shown."
      };
    }
  }

  function boot() {
    var form = document.getElementById("lt-form");
    if (!form) return;
    var modeEl = document.getElementById("lt-mode");
    var inputEl = document.getElementById("lt-input");
    var hintEl = document.getElementById("lt-hint");
    var errorEl = document.getElementById("lt-error");
    var resultEl = document.getElementById("lt-result");
    var amountEl = document.getElementById("lt-amount");
    var piecesEl = document.getElementById("lt-pieces");
    var detailEl = document.getElementById("lt-detail");

    function clearError() {
      errorEl.textContent = "";
      errorEl.classList.remove("visible");
    }
    function showError(msg) {
      resultEl.classList.remove("visible");
      amountEl.textContent = "";
      piecesEl.textContent = "";
      detailEl.textContent = "";
      errorEl.textContent = msg;
      errorEl.classList.add("visible");
    }
    function hint() {
      if (modeEl.value === "inverse") {
        hintEl.textContent = "Inverse mode reads a function of s. Use rational numbers, s, sums, products, and integer powers. Good forms are A/(s-a), A/(s-a)^n, (As+B)/((s-a)^2+b^2), and a proper fraction whose denominator factors into those pieces with rational coefficients. A decimal is an exact fraction of a power of ten.";
      } else {
        hintEl.textContent = "Forward mode reads a function of t. Linear combinations of constants, t^n, e^(at), sin(bt), cos(bt), sinh(bt), cosh(bt), and a product of one exponential with one of those. e^2t means e^(2t). Juxtaposition multiplies. A decimal is an exact fraction of a power of ten.";
      }
    }
    function run() {
      clearError();
      var result = compute(inputEl.value, modeEl.value);
      if (!result.ok) {
        showError(result.error);
        return;
      }
      var label = result.mode === "inverse" ? "f(t) = " : "F(s) = ";
      amountEl.textContent = label + result.answer;
      if (result.mode === "forward" && result.pieces && result.pieces.length > 1) {
        piecesEl.textContent = "Before combining: " + joinFormulas(result.pieces);
      } else if (result.mode === "inverse" && result.partial && result.partial !== result.answer) {
        piecesEl.textContent = "Partial fractions invert to " + result.partial + ".";
      } else piecesEl.textContent = "";
      detailEl.textContent = result.steps.join("\n") + "\n\nEducational use only.";
      resultEl.classList.add("visible");
    }
    modeEl.addEventListener("change", function () {
      hint();
      clearError();
      resultEl.classList.remove("visible");
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      run();
    });
    var reset = document.getElementById("lt-reset");
    if (reset) {
      reset.addEventListener("click", function () {
        modeEl.value = "forward";
        inputEl.value = "2*e^(-t)-e^(-2*t)";
        hint();
        run();
        inputEl.focus();
      });
    }
    function preset(mode, value) {
      return function () {
        modeEl.value = mode;
        inputEl.value = value;
        hint();
        run();
      };
    }
    var buttons = [
      ["lt-preset-ivp", "forward", "2*e^(-t)-e^(-2*t)"],
      ["lt-preset-shift", "forward", "e^(2t)*sin(3t)"],
      ["lt-preset-power", "forward", "t^2*e^(3t)"],
      ["lt-preset-inv", "inverse", "(s+3)/((s+1)*(s+2))"],
      ["lt-preset-quad", "inverse", "(2*s+3)/(s^2+4*s+13)"]
    ];
    buttons.forEach(function (spec) {
      var btn = document.getElementById(spec[0]);
      if (btn) btn.addEventListener("click", preset(spec[1], spec[2]));
    });
    hint();
    if (String(inputEl.value).trim()) run();
  }

  return {
    MINUS: MINUS,
    compute: compute,
    forward: function (input) { return compute(input, "forward"); },
    inverse: function (input) { return compute(input, "inverse"); },
    boot: boot
  };
});
