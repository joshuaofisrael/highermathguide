/* Wronskian of two or three functions of x. Symbolic derivatives for common formulas, numeric value at x0 always. No libraries. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.WronskianCalc = api;
  if (typeof document !== "undefined") api.boot();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MINUS = "\u2212";
  var NORM_DEPTH = 0;

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
    if (d === 0n) throw new Error("Division by zero.");
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    var g = gcd(n, d);
    return { n: n / g, d: d / g };
  }

  function addR(a, b) { return rat(a.n * b.d + b.n * a.d, a.d * b.d); }
  function subR(a, b) { return rat(a.n * b.d - b.n * a.d, a.d * b.d); }
  function mulR(a, b) { return rat(a.n * b.n, a.d * b.d); }
  function divR(a, b) {
    if (b.n === 0n) throw new Error("Division by zero.");
    return rat(a.n * b.d, a.d * b.n);
  }
  function negR(a) { return rat(-a.n, a.d); }
  function eqR(a, b) { return a.n === b.n && a.d === b.d; }
  function isZeroR(a) { return a.n === 0n; }
  function isOneR(a) { return a.n === 1n && a.d === 1n; }
  function isNegOneR(a) { return a.n === -1n && a.d === 1n; }
  function cmpR(a, b) {
    var left = a.n * b.d;
    var right = b.n * a.d;
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  }

  var ZERO = rat(0n, 1n);
  var ONE = rat(1n, 1n);
  var NEG_ONE = rat(-1n, 1n);

  function numNode(r) { return ["n", r.n, r.d]; }
  function isZeroTerms(terms) {
    for (var i = 0; i < terms.length; i++) if (!isZeroR(terms[i].c)) return false;
    return true;
  }

  function isqrt(n) {
    if (n < 0n) return null;
    if (n < 2n) return n;
    var x = n;
    var y = (x + 1n) / 2n;
    var guard = 0;
    while (y < x && guard++ < 10000) {
      x = y;
      y = (x + n / x) / 2n;
    }
    if (x * x > n) x -= 1n;
    return x * x === n ? x : null;
  }

  function powRat(r, e) {
    if (isZeroR(r)) {
      if (e.n < 0n) throw new Error("Division by zero.");
      if (e.n === 0n) throw new Error("0^0 is undefined here.");
      return ZERO;
    }
    if (e.n === 0n) return ONE;
    if (e.d !== 1n) {
      if (e.n < 0n) {
        var inv = powRat(rat(r.d, r.n), rat(-e.n, e.d));
        return inv;
      }
      var root = rootRat(r, e.d);
      if (!root) return null;
      return powRat(root, rat(e.n, 1n));
    }
    var k = e.n;
    if (k < 0n) return powRat(rat(r.d, r.n), rat(-k, 1n));
    if (k > 12n) return null;
    return rat(r.n ** k, r.d ** k);
  }

  function rootRat(r, q) {
    if (q === 1n) return r;
    if (q !== 2n) return null;
    if (r.n < 0n) return null;
    var ns = isqrt(r.n);
    var ds = isqrt(r.d);
    if (ns === null || ds === null) return null;
    return rat(ns, ds);
  }

  function canon(node) {
    if (!node) return "";
    var k = node[0];
    if (k === "n") return "n" + node[1].toString() + "/" + node[2].toString();
    if (k === "v") return "x";
    if (k === "c") return "c:" + node[1];
    if (k === "+" || k === "*") {
      var parts = [];
      for (var i = 1; i < node.length; i++) parts.push(canon(node[i]));
      parts.sort();
      return k + "(" + parts.join(",") + ")";
    }
    if (k === "^") return "^(" + canon(node[1]) + "," + canon(node[2]) + ")";
    if (k === "f") return node[1] + "(" + canon(node[2]) + ")";
    return "?";
  }

  function baseKey(f) {
    if (f.k === "x") return "x";
    if (f.k === "pi") return "pi";
    if (f.k === "pow") return "pow(" + canon(f.base) + ")";
    return f.k + "(" + canon(f.arg) + ")";
  }

  function expStr(e) { return e.n.toString() + "/" + e.d.toString(); }

  function fsKey(fs) {
    var parts = [];
    for (var i = 0; i < fs.length; i++) {
      if (fs[i].e.n === 0n) continue;
      parts.push(baseKey(fs[i]) + "^" + expStr(fs[i].e));
    }
    parts.sort();
    return parts.join("*");
  }

  function factorToNode(f) {
    if (f.k === "x") {
      if (isOneR(f.e)) return ["v"];
      return ["^", ["v"], numNode(f.e)];
    }
    if (f.k === "pi") {
      if (isOneR(f.e)) return ["c", "pi"];
      return ["^", ["c", "pi"], numNode(f.e)];
    }
    if (f.k === "pow") {
      if (isOneR(f.e)) return f.base;
      return ["^", f.base, numNode(f.e)];
    }
    var arg = f.arg;
    if (f.k === "exp" && !isOneR(f.e)) arg = ["*", numNode(f.e), arg];
    var call = ["f", f.k, arg];
    if (f.k !== "exp" && !isOneR(f.e)) return ["^", call, numNode(f.e)];
    return call;
  }

  function termToNode(t) {
    var bits = [];
    if (t.fs.length === 0 || !isOneR(t.c)) bits.push(numNode(t.c));
    var fs = t.fs.slice().sort(function (a, b) {
      var oa = factorOrder(a);
      var ob = factorOrder(b);
      if (oa !== ob) return oa - ob;
      return baseKey(a) < baseKey(b) ? -1 : 1;
    });
    for (var i = 0; i < fs.length; i++) {
      if (fs[i].e.n === 0n) continue;
      bits.push(factorToNode(fs[i]));
    }
    if (!bits.length) return numNode(ZERO);
    if (bits.length === 1) return bits[0];
    return ["*"].concat(bits);
  }

  function factorOrder(f) {
    var order = { x: 0, pi: 1, exp: 2, ln: 3, sin: 4, cos: 5, tan: 6, abs: 7, pow: 8 };
    return order[f.k] === undefined ? 9 : order[f.k];
  }

  function fromTerms(terms) {
    var live = [];
    for (var i = 0; i < terms.length; i++) if (!isZeroR(terms[i].c)) live.push(terms[i]);
    if (!live.length) return numNode(ZERO);
    live.sort(compareTerms);
    if (live.length === 1) return termToNode(live[0]);
    var sum = ["+"];
    for (var j = 0; j < live.length; j++) sum.push(termToNode(live[j]));
    return sum;
  }

function compareTerms(a, b) {
  var da = polyDegree(a.fs);
  var db = polyDegree(b.fs);
  var aConst = da === 0;
  var bConst = db === 0;
  if (aConst !== bConst) return aConst ? 1 : -1;
  if (da !== null && db !== null && da !== db) return db - da;
  if (da !== null && db === null) return -1;
  if (da === null && db !== null) return 1;
    var ka = fsKey(a.fs);
    var kb = fsKey(b.fs);
    if (ka < kb) return -1;
    if (ka > kb) return 1;
    return 0;
  }

  function polyDegree(fs) {
    var deg = 0;
    for (var i = 0; i < fs.length; i++) {
      if (fs[i].k !== "x") return null;
      if (fs[i].e.d !== 1n) return null;
      deg += Number(fs[i].e.n);
    }
    return deg;
  }

  function mergeFactors(fs) {
    var acc = [];
    var expArgs = [];
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i];
      if (f.e.n === 0n) continue;
      if (f.k === "exp") {
        var arg = f.arg;
        if (!isOneR(f.e)) arg = ["*", numNode(f.e), arg];
        expArgs.push(arg);
        continue;
      }
      var key = baseKey(f);
      var found = null;
      for (var j = 0; j < acc.length; j++) {
        if (baseKey(acc[j]) === key) { found = acc[j]; break; }
      }
      if (found) found.e = addR(found.e, f.e);
      else acc.push({ k: f.k, arg: f.arg, base: f.base, e: f.e });
    }
    var kept = [];
    for (var n = 0; n < acc.length; n++) if (acc[n].e.n !== 0n) kept.push(acc[n]);
    if (expArgs.length) {
      var sum = expArgs[0];
      for (var e = 1; e < expArgs.length; e++) sum = ["+", sum, expArgs[e]];
      var simplified = norm(sum);
      if (!isZeroTerms(simplified)) {
        kept.push({ k: "exp", arg: fromTerms(simplified), e: ONE });
      }
    }
    return kept;
  }

  function collect(terms) {
    var map = new Map();
    var order = [];
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      if (isZeroR(t.c)) continue;
      var fs = [];
      for (var j = 0; j < t.fs.length; j++) if (t.fs[j].e.n !== 0n) fs.push(t.fs[j]);
      var key = fsKey(fs);
      if (!map.has(key)) {
        map.set(key, { c: t.c, fs: fs });
        order.push(key);
      } else {
        var hit = map.get(key);
        hit.c = addR(hit.c, t.c);
      }
    }
    var out = [];
    for (var k = 0; k < order.length; k++) {
      var row = map.get(order[k]);
      if (!isZeroR(row.c)) out.push(row);
    }
    return out;
  }

  function addToMap(map, fs, coef) {
    if (isZeroR(coef)) return;
    var clean = [];
    for (var i = 0; i < fs.length; i++) if (fs[i].e.n !== 0n) clean.push(fs[i]);
    var key = fsKey(clean);
    if (!map.has(key) || isZeroR(map.get(key).c)) map.set(key, { c: coef, fs: clean });
    else map.get(key).c = addR(map.get(key).c, coef);
  }

  function applyPythag(terms) {
    var map = new Map();
    for (var i = 0; i < terms.length; i++) addToMap(map, terms[i].fs, terms[i].c);
    var guard = 0;
    var changed = true;
    while (changed && guard++ < 16) {
      changed = false;
      var keys = Array.from(map.keys());
      for (var k = 0; k < keys.length; k++) {
        var entry = map.get(keys[k]);
        if (!entry || isZeroR(entry.c)) continue;
        var sinIndex = -1;
        for (var s = 0; s < entry.fs.length; s++) {
          if (entry.fs[s].k === "sin" && cmpR(entry.fs[s].e, rat(2n, 1n)) >= 0) { sinIndex = s; break; }
        }
        if (sinIndex < 0) continue;
        var sinF = entry.fs[sinIndex];
        var argKey = canon(sinF.arg);
        var partner = [];
        for (var p = 0; p < entry.fs.length; p++) {
          if (p === sinIndex) {
            var left = subR(sinF.e, rat(2n, 1n));
            if (left.n !== 0n) partner.push({ k: "sin", arg: sinF.arg, e: left });
          } else partner.push({ k: entry.fs[p].k, arg: entry.fs[p].arg, base: entry.fs[p].base, e: entry.fs[p].e });
        }
        var cosHit = null;
        for (var c = 0; c < partner.length; c++) {
          if (partner[c].k === "cos" && canon(partner[c].arg) === argKey) { cosHit = partner[c]; break; }
        }
        if (cosHit) cosHit.e = addR(cosHit.e, rat(2n, 1n));
        else partner.push({ k: "cos", arg: sinF.arg, e: rat(2n, 1n) });
        var partnerKey = fsKey(partner);
        var other = map.get(partnerKey);
        if (!other || isZeroR(other.c)) continue;
        var A = entry.c;
        var B = other.c;
        entry.c = ZERO;
        other.c = ZERO;
        var reduced = [];
        for (var r = 0; r < entry.fs.length; r++) {
          if (r === sinIndex) {
            var re = subR(sinF.e, rat(2n, 1n));
            if (re.n !== 0n) reduced.push({ k: "sin", arg: sinF.arg, e: re });
          } else reduced.push({ k: entry.fs[r].k, arg: entry.fs[r].arg, base: entry.fs[r].base, e: entry.fs[r].e });
        }
        addToMap(map, reduced, A);
        addToMap(map, partner, subR(B, A));
        changed = true;
        break;
      }
    }
    var out = [];
    map.forEach(function (entry) {
      if (!isZeroR(entry.c)) out.push({ c: entry.c, fs: entry.fs });
    });
    return out;
  }

  function cleanup(terms) {
    var merged = [];
    for (var i = 0; i < terms.length; i++) {
      if (isZeroR(terms[i].c)) continue;
      merged.push({ c: terms[i].c, fs: mergeFactors(terms[i].fs) });
    }
    return applyPythag(collect(merged));
  }

  function mulTerms(A, B) {
    if (!A.length || !B.length) return [];
    if (A.length * B.length > 500) throw new Error("This expression is too large for the symbolic step.");
    var out = [];
    for (var i = 0; i < A.length; i++) {
      for (var j = 0; j < B.length; j++) {
        out.push({ c: mulR(A[i].c, B[j].c), fs: A[i].fs.concat(B[j].fs) });
      }
    }
    return cleanup(out);
  }

  function asSingleExpArg(terms) {
    if (terms.length !== 1) return null;
    var t = terms[0];
    if (!isOneR(t.c) || t.fs.length !== 1 || t.fs[0].k !== "exp") return null;
    if (isOneR(t.fs[0].e)) return t.fs[0].arg;
    return ["*", numNode(t.fs[0].e), t.fs[0].arg];
  }

  function isPureRational(terms) {
    return terms.length === 1 && terms[0].fs.length === 0;
  }

  function normPowRational(base, q) {
    var terms = norm(base);
    if (isZeroTerms(terms)) {
      if (q.n <= 0n) throw new Error("Division by zero.");
      return [];
    }
    if (terms.length === 1) {
      var c = powRat(terms[0].c, q);
      if (c) {
        var fs = [];
        for (var i = 0; i < terms[0].fs.length; i++) {
          var f = terms[0].fs[i];
          fs.push({ k: f.k, arg: f.arg, base: f.base, e: mulR(f.e, q) });
        }
        return cleanup([{ c: c, fs: fs }]);
      }
    }
    if (q.d === 1n && q.n > 0n && q.n <= 8n && terms.length > 1) {
      var acc = [{ c: ONE, fs: [] }];
      var times = Number(q.n);
      for (var n = 0; n < times; n++) acc = mulTerms(acc, terms);
      return acc;
    }
    return [{ c: ONE, fs: [{ k: "pow", base: fromTerms(terms), e: q }] }];
  }

  function normPow(base, exponent) {
    var expTerms = norm(exponent);
    if (isPureRational(expTerms)) return normPowRational(base, expTerms[0].c);
    var baseTerms = norm(base);
    var expArg = asSingleExpArg(baseTerms);
    if (expArg) return norm(["f", "exp", ["*", exponent, expArg]]);
    return norm(["f", "exp", ["*", exponent, ["f", "ln", fromTerms(baseTerms)]]]);
  }

  function normFn(name, arg) {
    if (name === "sqrt") return normPow(arg, numNode(rat(1n, 2n)));
    if (name === "abs") {
      var innerAbs = norm(arg);
      return [{ c: ONE, fs: [{ k: "abs", arg: fromTerms(innerAbs), e: ONE }] }];
    }
    var inner = norm(arg);
    if (name === "ln") {
      var expArg = asSingleExpArg(inner);
      if (expArg) return norm(expArg);
      if (isPureRational(inner) && isOneR(inner[0].c)) return [];
      return [{ c: ONE, fs: [{ k: "ln", arg: fromTerms(inner), e: ONE }] }];
    }
    if (name === "exp") {
      if (isZeroTerms(inner)) return [{ c: ONE, fs: [] }];
      if (inner.length === 1 && inner[0].fs.length === 1 && inner[0].fs[0].k === "ln") {
        return normPow(inner[0].fs[0].arg, mulR(inner[0].c, inner[0].fs[0].e));
      }
      var acc = [{ c: ONE, fs: [] }];
      for (var i = 0; i < inner.length; i++) {
        var t = inner[i];
        var argNode = t.fs.length ? termToNode(t) : numNode(t.c);
        if (t.fs.length === 0 && isZeroR(t.c)) continue;
        acc = mulTerms(acc, [{ c: ONE, fs: [{ k: "exp", arg: argNode, e: ONE }] }]);
      }
      return acc;
    }
    if (name === "sin" || name === "cos" || name === "tan") {
      if (isZeroTerms(inner)) {
        if (name === "cos") return [{ c: ONE, fs: [] }];
        return [];
      }
      return [{ c: ONE, fs: [{ k: name, arg: fromTerms(inner), e: ONE }] }];
    }
    throw new Error("Unknown function " + name + ".");
  }

  function norm(node) {
    NORM_DEPTH += 1;
    if (NORM_DEPTH > 80) throw new Error("This expression is too nested for the symbolic step.");
    try {
      return normInner(node);
    } finally {
      NORM_DEPTH -= 1;
    }
  }

  function normInner(node) {
    if (!node) return [];
    if (node[0] === "n") {
      var r = rat(node[1], node[2]);
      if (isZeroR(r)) return [];
      return [{ c: r, fs: [] }];
    }
    if (node[0] === "v") return [{ c: ONE, fs: [{ k: "x", e: ONE }] }];
    if (node[0] === "c" && node[1] === "pi") return [{ c: ONE, fs: [{ k: "pi", e: ONE }] }];
    if (node[0] === "+") {
      var terms = [];
      for (var i = 1; i < node.length; i++) terms = terms.concat(norm(node[i]));
      return cleanup(terms);
    }
    if (node[0] === "*") {
      var acc = [{ c: ONE, fs: [] }];
      for (var j = 1; j < node.length; j++) acc = mulTerms(acc, norm(node[j]));
      return acc;
    }
    if (node[0] === "^") return normPow(node[1], node[2]);
    if (node[0] === "f") return normFn(node[1], node[2]);
    throw new Error("Could not read part of the expression.");
  }

  function dependsOnX(node) {
    if (!node) return false;
    if (node[0] === "v") return true;
    if (node[0] === "n" || node[0] === "c") return false;
    for (var i = 1; i < node.length; i++) {
      if (node[i] && typeof node[i] === "object" && dependsOnX(node[i])) return true;
    }
    return false;
  }

  function D(node) {
    if (node[0] === "n" || node[0] === "c") return numNode(ZERO);
    if (node[0] === "v") return numNode(ONE);
    if (node[0] === "+") {
      var sum = ["+"];
      for (var i = 1; i < node.length; i++) sum.push(D(node[i]));
      return sum;
    }
    if (node[0] === "*") {
      var parts = node.slice(1);
      var sumP = ["+"];
      for (var p = 0; p < parts.length; p++) {
        var copy = parts.slice();
        copy[p] = D(parts[p]);
        sumP.push(["*"].concat(copy));
      }
      return sumP.length === 2 ? sumP[1] : sumP;
    }
    if (node[0] === "^") {
      var base = node[1];
      var exp = node[2];
      if (!dependsOnX(exp)) {
        var em1 = ["+", exp, numNode(NEG_ONE)];
        return ["*", exp, ["^", base, em1], D(base)];
      }
      return D(["f", "exp", ["*", exp, ["f", "ln", base]]]);
    }
    if (node[0] === "f") {
      var name = node[1];
      var arg = node[2];
      var da = D(arg);
      if (name === "sin") return ["*", ["f", "cos", arg], da];
      if (name === "cos") return ["*", numNode(NEG_ONE), ["f", "sin", arg], da];
      if (name === "tan") return ["*", ["^", ["f", "cos", arg], numNode(rat(-2n, 1n))], da];
      if (name === "ln") return ["*", da, ["^", arg, numNode(NEG_ONE)]];
      if (name === "exp") return ["*", node, da];
      if (name === "abs") throw new Error("The absolute value has a corner, so this page will not differentiate it symbolically.");
      if (name === "sqrt") return D(["^", arg, numNode(rat(1n, 2n))]);
    }
    throw new Error("This expression has no symbolic derivative on this page.");
  }

  function simplifyNode(node) { return fromTerms(norm(node)); }

  function derivativeNode(node) {
    var simple = simplifyNode(node);
    if (simple[0] === "f" && simple[1] === "abs") {
      throw new Error("The absolute value has a corner, so this page will not differentiate it symbolically.");
    }
    return fromTerms(norm(D(simple)));
  }

  function tokenize(input) {
    var s = String(input == null ? "" : input).trim();
    if (!s) throw new Error("Enter a function of x.");
    if (s.length > 300) throw new Error("That expression is too long for this page.");
    s = s.replace(/\u2212|\u2013|\u2014/g, "-");
    s = s.replace(/[·×]/g, "*");
    s = s.replace(/\*\*/g, "^");
    s = s.replace(/\{/g, "(").replace(/\}/g, ")");
    s = s.replace(/²/g, "^2").replace(/³/g, "^3");
    s = s.replace(/\bsinx\b/gi, "sin(x)");
    s = s.replace(/\bcosx\b/gi, "cos(x)");
    s = s.replace(/\btanx\b/gi, "tan(x)");
    s = s.replace(/\blnx\b/gi, "ln(x)");
    s = s.replace(/\blogx\b/gi, "log(x)");
    s = s.replace(/\bexpx\b/gi, "exp(x)");
    var tokens = [];
    var i = 0;
    while (i < s.length) {
      var ch = s.charAt(i);
      if (/\s/.test(ch)) { i += 1; continue; }
      if (/[0-9.]/.test(ch)) {
        var j = i;
        var dots = 0;
        while (j < s.length && /[0-9.]/.test(s.charAt(j))) {
          if (s.charAt(j) === ".") dots += 1;
          j += 1;
        }
        var raw = s.slice(i, j);
        if (dots > 1 || raw === ".") throw new Error("Could not read the number " + raw + ".");
        tokens.push({ k: "num", v: raw });
        i = j;
        continue;
      }
      if (/[a-zA-Z]/.test(ch)) {
        var k = i + 1;
        while (k < s.length && /[a-zA-Z]/.test(s.charAt(k))) k += 1;
        tokens.push({ k: "ident", v: s.slice(i, k) });
        i = k;
        continue;
      }
      if ("+-*/^()".indexOf(ch) >= 0) {
        tokens.push({ k: "op", v: ch });
        i += 1;
        continue;
      }
      throw new Error("Unsupported character \"" + ch + "\". Use x, numbers, + − * / ^, parentheses, and sin, cos, tan, ln, exp, sqrt, e, or pi.");
    }
    if (!tokens.length) throw new Error("Enter a function of x.");
    return tokens;
  }

  function parseNumber(raw) {
    if (/^\d+$/.test(raw)) return rat(BigInt(raw), 1n);
    var m = raw.match(/^(\d*)\.(\d+)$/);
    if (!m) throw new Error("Could not read the number " + raw + ".");
    var whole = m[1] || "0";
    var frac = m[2];
    return rat(BigInt(whole + frac), 10n ** BigInt(frac.length));
  }

  var FUNCS = { sin: "sin", cos: "cos", tan: "tan", ln: "ln", log: "ln", exp: "exp", sqrt: "sqrt", abs: "abs" };

  function parseExpr(input) {
    var tokens = tokenize(input);
    var pos = 0;
    function peek() { return tokens[pos]; }
    function take() { return tokens[pos++]; }
    function parseTop() {
      var node = parseSum();
      if (peek()) throw new Error("Could not read the rest of the expression, starting at \"" + peek().v + "\".");
      return node;
    }
    function parseSum() {
      var left = parseProduct();
      while (peek() && (peek().v === "+" || peek().v === "-")) {
        var op = take().v;
        var right = parseProduct();
        left = op === "+" ? ["+", left, right] : ["+", left, ["*", numNode(NEG_ONE), right]];
      }
      return left;
    }
    function parseProduct() {
      var left = parseUnary();
      while (peek()) {
        var t = peek();
        if (t.v === "*" || t.v === "/") {
          take();
          var right = parseUnary();
          left = t.v === "*" ? ["*", left, right] : ["*", left, ["^", right, numNode(NEG_ONE)]];
          continue;
        }
        if (startsPrimary(t)) {
          left = ["*", left, parseUnary()];
          continue;
        }
        break;
      }
      return left;
    }
    function startsPrimary(t) {
      if (!t) return false;
      if (t.k === "num" || t.v === "(") return true;
      if (t.k === "ident") return true;
      return false;
    }
    function restrictedStart(t) {
      if (!t) return false;
      if (t.k === "num" || t.v === "(") return true;
      if (t.k === "ident") {
        var n = t.v.toLowerCase();
        return n === "x" || n === "e" || n === "pi";
      }
      return false;
    }
    function parseUnary() {
      if (peek() && peek().v === "+") { take(); return parseUnary(); }
      if (peek() && peek().v === "-") { take(); return ["*", numNode(NEG_ONE), parseUnary()]; }
      return parsePower();
    }
    function parsePower() {
      var base = parsePrimary();
      if (!(peek() && peek().v === "^")) return base;
      take();
      var exp = parseUnary();
      if (isENode(base) && peek() && peek().k === "ident" && peek().v.toLowerCase() === "x" && !dependsOnX(exp)) {
        take();
        exp = ["*", exp, ["v"]];
      }
      return ["^", base, exp];
    }
    function parsePrimary() {
      var t = peek();
      if (!t) throw new Error("The expression ended early.");
      if (t.v === "(") {
        take();
        var inner = parseSum();
        if (!peek() || peek().v !== ")") throw new Error("Missing a closing parenthesis.");
        take();
        return inner;
      }
      if (t.k === "num") {
        take();
        return numNode(parseNumber(t.v));
      }
      if (t.k === "ident") {
        take();
        var name = t.v.toLowerCase();
        if (name === "x") return ["v"];
        if (name === "e") return ["f", "exp", numNode(ONE)];
        if (name === "pi") return ["c", "pi"];
        if (FUNCS[name]) {
          var exponent = null;
          if (peek() && peek().v === "^") {
            take();
            exponent = parseUnary();
          }
          var arg = readArg(FUNCS[name]);
          var call = ["f", FUNCS[name], arg];
          if (exponent) return ["^", call, exponent];
          return call;
        }
        throw new Error("Unknown name \"" + name + "\". This page uses the variable x, together with sin, cos, tan, ln, log, exp, sqrt, e, and pi.");
      }
      throw new Error("Unexpected \"" + t.v + "\".");
    }
    function readArg(fname) {
      if (peek() && peek().v === "(") {
        take();
        var inner = parseSum();
        if (!peek() || peek().v !== ")") throw new Error("Missing a closing parenthesis after " + fname + ".");
        take();
        return inner;
      }
      if (!restrictedStart(peek())) throw new Error(fname + " needs an argument. Try " + fname + "(x).");
      return parseRestrictedProduct();
    }
    function parseRestrictedProduct() {
      var left = parseUnary();
      while (peek() && (peek().v === "*" || peek().v === "/" || restrictedStart(peek()))) {
        if (peek().v === "*" || peek().v === "/") {
          var op = take().v;
          var right = parseUnary();
          left = op === "*" ? ["*", left, right] : ["*", left, ["^", right, numNode(NEG_ONE)]];
        } else left = ["*", left, parseUnary()];
      }
      return left;
    }
    return parseTop();
  }

  function isENode(node) {
    return node && node[0] === "f" && node[1] === "exp" && node[2] && node[2][0] === "n" && node[2][1] === 1n && node[2][2] === 1n;
  }

  function fmtRat(r) {
    var sign = r.n < 0n ? MINUS : "";
    var n = r.n < 0n ? -r.n : r.n;
    if (r.d === 1n) return sign + n.toString();
    return sign + n.toString() + "/" + r.d.toString();
  }

  function expPlain(e) {
    if (e.d === 1n) return e.n.toString();
    return e.n.toString() + "/" + e.d.toString();
  }

  function fmtExp(arg) {
    if (arg && arg[0] === "v") return "e^x";
    if (arg && arg[0] === "n") {
      if (arg[1] === 1n && arg[2] === 1n) return "e";
      return "e^(" + fmtRat(rat(arg[1], arg[2])) + ")";
    }
    if (arg && arg[0] === "*" && arg.length === 3 && arg[2][0] === "v" && arg[1][0] === "n") {
      var c = rat(arg[1][1], arg[1][2]);
      if (isOneR(c)) return "e^x";
      if (isNegOneR(c)) return "e^(" + MINUS + "x)";
      return "e^(" + fmtRat(c) + "x)";
    }
    if (arg && arg[0] === "*" && arg.length === 3 && arg[1][0] === "v" && arg[2][0] === "n") {
      return fmtExp(["*", arg[2], arg[1]]);
    }
    return "e^(" + fmtNode(arg, 0) + ")";
  }

  function fmtNode(node, prec) {
    if (!node) return "";
    if (node[0] === "n") {
      var s = fmtRat(rat(node[1], node[2]));
      if (node[1] < 0n && prec > 0) return "(" + s + ")";
      return s;
    }
    if (node[0] === "v") return "x";
    if (node[0] === "c") return "pi";
    if (node[0] === "+") {
      var bits = "";
      for (var i = 1; i < node.length; i++) {
        var child = node[i];
        var neg = child[0] === "n" && child[1] < 0n;
        var shown = neg ? numNode(rat(-child[1], child[2])) : child;
        var body = fmtNode(shown, 1);
        if (i === 1) bits += (neg ? MINUS : "") + body;
        else bits += neg ? " " + MINUS + " " + body : " + " + body;
      }
      if (prec > 0) return "(" + bits + ")";
      return bits;
    }
    if (node[0] === "*") {
      var sign = 1;
      var parts = [];
      for (var m = 1; m < node.length; m++) {
        var factor = node[m];
        if (factor[0] === "n") {
          var rv = rat(factor[1], factor[2]);
          if (rv.n < 0n) { sign *= -1; rv = rat(-rv.n, rv.d); }
          if (!isOneR(rv)) parts.push(fmtRat(rv));
        } else parts.push(fmtNode(factor, 2));
      }
      if (!parts.length) parts.push("1");
      var body = joinMul(parts);
      if (sign < 0) body = MINUS + body;
      if (sign < 0 && prec > 1) return "(" + body + ")";
      return body;
    }
    if (node[0] === "^") {
      var baseNode = node[1];
      var base = (baseNode[0] === "+" || baseNode[0] === "*") ? "(" + fmtNode(baseNode, 0) + ")" : fmtNode(baseNode, 2);
      var ex = fmtNode(node[2], 2);
      if (ex.indexOf(" ") >= 0 || ex.charAt(0) === MINUS || ex.charAt(0) === "-") ex = "(" + ex + ")";
      return base + "^" + ex;
    }
    if (node[0] === "f" && node[1] === "exp") return fmtExp(node[2]);
    if (node[0] === "f") return node[1] + "(" + fmtNode(node[2], 0) + ")";
    return "?";
  }

  function joinMul(parts) {
    var s = parts[0];
    for (var i = 1; i < parts.length; i++) {
      var p = parts[i];
      if (/^\d+$/.test(s) && p.charAt(0) === "x") s += p;
      else s += " " + p;
    }
    return s;
  }

  function fmtFactorBody(f, exp) {
    if (f.k === "x") {
      if (isOneR(exp)) return "x";
      if (exp.n === 1n && exp.d === 2n) return "sqrt(x)";
      return "x^" + expPlain(exp);
    }
    if (f.k === "pi") {
      if (isOneR(exp)) return "pi";
      return "pi^" + expPlain(exp);
    }
    if (f.k === "exp") {
      var arg = isOneR(exp) ? f.arg : ["*", numNode(exp), f.arg];
      return fmtExp(arg);
    }
    if (f.k === "pow") {
      var inner = fmtNode(f.base, 0);
      var wrapped = "(" + inner + ")";
      if (isOneR(exp)) return wrapped;
      if (exp.n === 1n && exp.d === 2n) return "sqrt(" + inner + ")";
      return wrapped + "^" + expPlain(exp);
    }
    var call = f.k + "(" + fmtNode(f.arg, 0) + ")";
    if (isOneR(exp)) return call;
    if (exp.n === 1n && exp.d === 2n) return "sqrt(" + call + ")";
    return call + "^" + expPlain(exp);
  }

  function fmtTerms(terms) {
    var live = [];
    for (var i = 0; i < terms.length; i++) if (!isZeroR(terms[i].c)) live.push(terms[i]);
    if (!live.length) return "0";
    live.sort(compareTerms);
    var out = "";
    for (var t = 0; t < live.length; t++) {
      var term = live[t];
      var neg = term.c.n < 0n;
      var abs = rat(neg ? -term.c.n : term.c.n, term.c.d);
      var body = fmtAbsTerm(abs, term.fs);
      if (t === 0) out += (neg ? MINUS : "") + body;
      else out += neg ? " " + MINUS + " " + body : " + " + body;
    }
    return out;
  }

  function fmtAbsTerm(abs, fs) {
    var nums = [];
    var dens = [];
    var ordered = fs.slice().sort(function (a, b) { return factorOrder(a) - factorOrder(b); });
    for (var i = 0; i < ordered.length; i++) {
      var f = ordered[i];
      if (f.e.n < 0n) dens.push(fmtFactorBody(f, negR(f.e)));
      else if (f.e.n > 0n) nums.push(fmtFactorBody(f, f.e));
    }
    var numParts = [];
    if (abs.n !== 1n || nums.length === 0) numParts.push(abs.n.toString());
    numParts = numParts.concat(nums);
    var numStr = joinMul(numParts);
    var denParts = [];
    if (abs.d !== 1n) denParts.push(abs.d.toString());
    denParts = denParts.concat(dens);
    if (!denParts.length) return numStr;
    var denStr = denParts.length === 1 ? denParts[0] : "(" + denParts.join(" ") + ")";
    return numStr + "/" + denStr;
  }

  function evalNode(node, x) {
    if (node[0] === "n") return Number(node[1]) / Number(node[2]);
    if (node[0] === "v") return x;
    if (node[0] === "c") return Math.PI;
    if (node[0] === "+") {
      var s = 0;
      for (var i = 1; i < node.length; i++) s += evalNode(node[i], x);
      return s;
    }
    if (node[0] === "*") {
      var p = 1;
      for (var j = 1; j < node.length; j++) p *= evalNode(node[j], x);
      return p;
    }
    if (node[0] === "^") return Math.pow(evalNode(node[1], x), evalNode(node[2], x));
    if (node[0] === "f") {
      var a = evalNode(node[2], x);
      if (node[1] === "sin") return Math.sin(a);
      if (node[1] === "cos") return Math.cos(a);
      if (node[1] === "tan") return Math.tan(a);
      if (node[1] === "ln") return Math.log(a);
      if (node[1] === "exp") return Math.exp(a);
      if (node[1] === "sqrt") return Math.sqrt(a);
      if (node[1] === "abs") return Math.abs(a);
    }
    return NaN;
  }

  function evalTerms(terms, x) {
    var s = 0;
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      var v = Number(t.c.n) / Number(t.c.d);
      for (var j = 0; j < t.fs.length; j++) v *= evalFactor(t.fs[j], x);
      s += v;
    }
    return s;
  }

  function evalFactor(f, x) {
    var base;
    if (f.k === "x") base = x;
    else if (f.k === "pi") base = Math.PI;
    else if (f.k === "exp") base = Math.exp(evalNode(f.arg, x));
    else if (f.k === "ln") base = Math.log(evalNode(f.arg, x));
    else if (f.k === "sin") base = Math.sin(evalNode(f.arg, x));
    else if (f.k === "cos") base = Math.cos(evalNode(f.arg, x));
    else if (f.k === "tan") base = Math.tan(evalNode(f.arg, x));
    else if (f.k === "abs") base = Math.abs(evalNode(f.arg, x));
    else if (f.k === "pow") base = evalNode(f.base, x);
    else base = NaN;
    return Math.pow(base, Number(f.e.n) / Number(f.e.d));
  }

  function neverZero(terms) {
    if (terms.length !== 1 || isZeroR(terms[0].c)) return false;
    for (var i = 0; i < terms[0].fs.length; i++) {
      if (terms[0].fs[i].k !== "exp") return false;
    }
    return true;
  }

  function constantMultiple(aTerms, bTerms) {
    if (!aTerms.length || !bTerms.length) return null;
    if (aTerms.length !== bTerms.length) return null;
    function rows(terms) {
      return terms.map(function (t) { return { k: fsKey(t.fs), c: t.c }; }).sort(function (p, q) {
        return p.k < q.k ? -1 : p.k > q.k ? 1 : 0;
      });
    }
    var A = rows(aTerms);
    var B = rows(bTerms);
    var c = divR(B[0].c, A[0].c);
    for (var i = 0; i < A.length; i++) {
      if (A[i].k !== B[i].k) return null;
      if (!eqR(B[i].c, mulR(A[i].c, c))) return null;
    }
    return c;
  }

  function detNumber(m) {
    var n = m.length;
    if (n === 1) return m[0][0];
    if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
    var s = 0;
    for (var col = 0; col < 3; col++) {
      var minor = [];
      for (var r = 1; r < 3; r++) {
        var row = [];
        for (var c = 0; c < 3; c++) if (c !== col) row.push(m[r][c]);
        minor.push(row);
      }
      var sign = col % 2 === 0 ? 1 : -1;
      s += sign * m[0][col] * detNumber(minor);
    }
    return s;
  }

  function detTerms(cols) {
    var n = cols.length;
    var rows = n;
    function at(r, c) { return cols[c][r]; }
    if (n === 2) {
      var ad = mulTerms(at(0, 0), at(1, 1));
      var bc = mulTerms(at(1, 0), at(0, 1));
      var neg = bc.map(function (t) { return { c: negR(t.c), fs: t.fs }; });
      return cleanup(ad.concat(neg));
    }
    function minor(c1, c2) {
      var ad = mulTerms(at(1, c1), at(2, c2));
      var bc = mulTerms(at(1, c2), at(2, c1));
      return cleanup(ad.concat(bc.map(function (t) { return { c: negR(t.c), fs: t.fs }; })));
    }
    var part0 = mulTerms(at(0, 0), minor(1, 2));
    var part1 = mulTerms(at(0, 1), minor(0, 2)).map(function (t) { return { c: negR(t.c), fs: t.fs }; });
    var part2 = mulTerms(at(0, 2), minor(0, 1));
    return cleanup(part0.concat(part1, part2));
  }

  function fmtNum(x) {
    if (!isFinite(x)) return "undefined";
    if (Math.abs(x) < 1e-10) return "0";
    var nearest = Math.round(x);
    if (Math.abs(x - nearest) <= 1e-8 * Math.max(1, Math.abs(x))) {
      var whole = String(nearest);
      if (whole.charAt(0) === "-") whole = MINUS + whole.slice(1);
      return whole;
    }
    var tenths = Math.round(x * 10000000000) / 10000000000;
    var text = String(tenths);
    if (text.length > 14) text = x.toPrecision(8);
    if (text.charAt(0) === "-") text = MINUS + text.slice(1);
    return text;
  }

  function central(fn, x, order) {
    if (order === 0) return fn(x);
    var h = order === 1 ? 1e-4 : 1e-3;
    if (order === 1) return (fn(x + h) - fn(x - h)) / (2 * h);
    return (fn(x + h) - 2 * fn(x) + fn(x - h)) / (h * h);
  }

  function conclude(o) {
    var caveat = "A Wronskian of 0 at one point does not prove linear dependence.";
    if (!o.defined) {
      var bits = "At x₀ = " + o.x0Text + ", at least one matrix entry is undefined or infinite, so the determinant is not a real number there. Pick a test point in the common domain. For ln x, that means a positive x₀.";
      if (o.identicallyZero) bits += " The symbolic Wronskian is the zero function wherever these formulas can be differentiated. For polynomials, exponentials, sine, cosine, and logarithms, that means the functions are linearly dependent on each interval where they are all analytic.";
      else if (o.detText) bits += " The symbolic Wronskian is " + o.detText + ".";
      return bits + " " + caveat;
    }
    if (o.identicallyZero) {
      var dep = "The symbolic Wronskian is 0. It is the zero function wherever these formulas can be differentiated.";
      if (o.relation) dep += " " + o.relation;
      dep += " Polynomials, exponentials, sine, cosine, and logarithms are analytic on each interval where they are defined. For those functions, a Wronskian that is the zero function means linear dependence on that interval.";
      dep += " If the functions are solutions of one linear homogeneous equation, Abel's identity says the same thing: the Wronskian is either always 0 or never 0, and always 0 means the solutions are dependent.";
      dep += " " + caveat + " That objection applies when the Wronskian is not the zero function. Here it is.";
      return dep;
    }
    if (o.neverZero) {
      return "The symbolic Wronskian is " + o.detText + ", which is never 0 for real x where the formula is defined. W(" + o.x0Text + ") = " + o.valueText + ", so the functions are linearly independent on every interval that contains this test point. A nonzero Wronskian at even one point proves linear independence. " + caveat;
    }
    if (o.valueNonZero) {
      return "W(" + o.x0Text + ") = " + o.valueText + ", which is not 0. These functions are linearly independent on every interval that contains x₀ = " + o.x0Text + ". The symbolic Wronskian is " + o.detText + ". A nonzero value at one point is enough. " + caveat;
    }
    return "W(" + o.x0Text + ") = 0. This single zero does not prove linear dependence. The symbolic Wronskian is " + o.detText + ", which is not the zero function, so the functions are linearly independent on any interval that contains a point where that expression is nonzero. The pair x and x² has Wronskian x², which is 0 at x = 0, and those two functions are still linearly independent. " + caveat;
  }

  function relationText(nodes) {
    for (var i = 0; i < nodes.length; i++) {
      if (isZeroTerms(norm(nodes[i]))) return "One of the functions is the zero function, so the list is linearly dependent.";
    }
    if (nodes.length === 2) {
      var c = constantMultiple(norm(nodes[0]), norm(nodes[1]));
      if (c) return "A direct relation is y₂ = " + fmtRat(c) + " y₁.";
    }
    return "";
  }

  function compute(expressions, x0Raw) {
    var exprs = expressions.filter(function (s) { return String(s || "").trim(); });
    if (exprs.length < 2 || exprs.length > 3) throw new Error("Enter two or three functions.");
    var xNode = parseExpr(String(x0Raw == null ? "0" : x0Raw).trim() || "0");
    if (dependsOnX(xNode)) throw new Error("The test point x₀ must be a number. It can use pi, e, fractions, and square roots, but not x.");
    var x0 = evalNode(simplifyNode(xNode), 0);
    if (!isFinite(x0)) throw new Error("Could not read the test point x₀.");
    var x0Text = fmtTerms(norm(xNode));
    var parsed = exprs.map(parseExpr);
    var symbolic = true;
    var symbolicError = "";
    var derivNodes = [];
    try {
      for (var i = 0; i < parsed.length; i++) {
        var d0 = simplifyNode(parsed[i]);
        var d1 = derivativeNode(parsed[i]);
        var col = [d0, d1];
        if (parsed.length === 3) col.push(derivativeNode(d1));
        derivNodes.push(col);
      }
    } catch (err) {
      symbolic = false;
      symbolicError = err.message || "Symbolic differentiation stopped.";
    }
    var labels = ["y₁", "y₂", "y₃"];
    var primes = ["", "′", "″"];
    if (!symbolic) {
      var fns = parsed.map(function (node) {
        return function (x) { return evalNode(node, x); };
      });
      var numCols = fns.map(function (fn) {
        var col = [];
        for (var r = 0; r < fns.length; r++) col.push(central(fn, x0, r));
        return col;
      });
      var defined = numCols.every(function (col) { return col.every(function (v) { return isFinite(v); }); });
      var value = defined ? detNumber(numCols) : NaN;
      var columns = numCols.map(function (col, idx) {
        return {
          label: labels[idx],
          input: exprs[idx],
          cells: col.map(function (v, r) {
            return { label: labels[idx] + primes[r], text: defined ? fmtNum(v) : "undefined" };
          })
        };
      });
      var conclusion = "Symbolic differentiation did not finish (" + symbolicError + "). The matrix uses central differences, with step 0.0001 for first derivatives and step 0.001 for a second derivative, so the determinant is a numeric estimate at x₀ only. ";
      if (!defined || !isFinite(value)) conclusion += "The estimate is not a real number at this test point. " + "A Wronskian of 0 at one point does not prove linear dependence.";
      else if (Math.abs(value) > 1e-7) conclusion += "The estimate W(" + x0Text + ") ≈ " + fmtNum(value) + " is not 0, which is evidence of linear independence near this point. A finite-difference zero would not prove dependence. A Wronskian of 0 at one point does not prove linear dependence.";
      else conclusion += "The estimate is about 0 at this single point. That does not prove linear dependence. A Wronskian of 0 at one point does not prove linear dependence.";
      return {
        ok: true,
        symbolic: false,
        x0: x0,
        x0Text: x0Text,
        columns: columns,
        determinant: null,
        valueText: isFinite(value) ? fmtNum(value) : "undefined",
        defined: defined && isFinite(value),
        conclusion: conclusion,
        steps: conclusion
      };
    }
    var termCols = derivNodes.map(function (col) { return col.map(norm); });
    var det = detTerms(termCols);
    var detText = fmtTerms(det);
    var symValue = evalTerms(det, x0);
    var matrixValue = detNumber(derivNodes.map(function (col) {
      return col.map(function (node) { return evalNode(node, x0); });
    }));
    var defined = isFinite(symValue) && isFinite(matrixValue);
    var value = defined ? symValue : NaN;
    if (defined && Math.abs(symValue - matrixValue) > 1e-6 * (1 + Math.abs(matrixValue))) {
      defined = isFinite(matrixValue);
      value = matrixValue;
    }
    var columns = derivNodes.map(function (col, idx) {
      return {
        label: labels[idx],
        input: exprs[idx],
        cells: col.map(function (node, r) {
          return { label: labels[idx] + primes[r], text: fmtTerms(norm(node)) };
        })
      };
    });
    var relation = isZeroTerms(det) ? relationText(parsed) : "";
    var info = {
      defined: defined,
      identicallyZero: isZeroTerms(det),
      neverZero: neverZero(det),
      valueNonZero: defined && Math.abs(value) > 1e-8,
      detText: detText,
      valueText: defined ? fmtNum(value) : "undefined",
      x0Text: x0Text,
      relation: relation
    };
    var lines = [];
    lines.push("Functions");
    columns.forEach(function (col, idx) { lines.push(labels[idx] + " = " + col.cells[0].text); });
    lines.push("");
    lines.push("Derivatives, simplified");
    columns.forEach(function (col) {
      for (var r = 1; r < col.cells.length; r++) lines.push(col.cells[r].label + " = " + col.cells[r].text);
    });
    lines.push("");
    lines.push("Wronskian determinant");
    if (columns.length === 2) {
      lines.push("W = y₁ y₂′ − y₁′ y₂");
    } else {
      lines.push("W = det of the matrix with y, y′, and y″ down the rows.");
    }
    lines.push("W = " + detText);
    lines.push("");
    lines.push("At x₀ = " + x0Text);
    lines.push(defined ? "W(x₀) = " + info.valueText : "W(x₀) is not a real number at this test point.");
    lines.push("The number is the symbolic determinant evaluated at x₀. It is not a finite-difference estimate.");
    if (defined && Math.abs(symValue - matrixValue) > 1e-6 * (1 + Math.abs(matrixValue))) {
      lines.push("The matrix of derivative values and the simplified determinant disagree past the rounding tolerance. Prefer a hand check before you trust the reading.");
    }
    var conclusion = conclude(info);
    return {
      ok: true,
      symbolic: true,
      x0: x0,
      x0Text: x0Text,
      columns: columns,
      determinant: detText,
      value: defined ? value : null,
      valueText: info.valueText,
      defined: defined,
      identicallyZero: info.identicallyZero,
      neverZero: info.neverZero,
      conclusion: conclusion,
      steps: lines.join("\n")
    };
  }

  function simplifyText(expr) { return fmtTerms(norm(parseExpr(expr))); }
  function derivativeText(expr) { return fmtTerms(norm(derivativeNode(parseExpr(expr)))); }

  function boot() {
    var form = document.getElementById("w-form");
    if (!form) return;
    var countEl = document.getElementById("w-count");
    var y1 = document.getElementById("w-y1");
    var y2 = document.getElementById("w-y2");
    var y3 = document.getElementById("w-y3");
    var y3wrap = document.getElementById("w-y3-wrap");
    var x0 = document.getElementById("w-x0");
    var errorEl = document.getElementById("w-error");
    var resultEl = document.getElementById("w-result");
    var amountEl = document.getElementById("w-amount");
    var conclusionEl = document.getElementById("w-conclusion");
    var detailEl = document.getElementById("w-detail");
    var matrixEl = document.getElementById("w-matrix");

    function showCount() {
      var three = countEl.value === "3";
      y3wrap.hidden = !three;
      y3.disabled = !three;
    }
    countEl.addEventListener("change", showCount);
    showCount();

    function clearError() {
      errorEl.textContent = "";
      errorEl.classList.remove("visible");
    }
    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.classList.add("visible");
      resultEl.classList.remove("visible");
    }
    function fillMatrix(columns) {
      matrixEl.textContent = "";
      var wrap = document.createElement("div");
      wrap.style.overflowX = "auto";
      var table = document.createElement("table");
      table.className = "stat-table";
      var caption = document.createElement("caption");
      caption.textContent = "Wronskian matrix";
      caption.style.captionSide = "top";
      caption.style.textAlign = "left";
      caption.style.fontWeight = "600";
      caption.style.padding = "0.65rem 0.85rem 0";
      table.appendChild(caption);
      var head = document.createElement("tr");
      var corner = document.createElement("th");
      corner.textContent = "Row";
      corner.scope = "col";
      head.appendChild(corner);
      columns.forEach(function (col) {
        var th = document.createElement("th");
        th.scope = "col";
        th.textContent = col.label;
        head.appendChild(th);
      });
      var thead = document.createElement("thead");
      thead.appendChild(head);
      table.appendChild(thead);
      var body = document.createElement("tbody");
      var rowCount = columns[0].cells.length;
      for (var r = 0; r < rowCount; r++) {
        var tr = document.createElement("tr");
        var th = document.createElement("th");
        th.scope = "row";
        th.textContent = r === 0 ? "function" : r === 1 ? "first derivative" : "second derivative";
        tr.appendChild(th);
        for (var c = 0; c < columns.length; c++) {
          var td = document.createElement("td");
          td.textContent = columns[c].cells[r].text;
          td.style.overflowWrap = "anywhere";
          tr.appendChild(td);
        }
        body.appendChild(tr);
      }
      table.appendChild(body);
      wrap.appendChild(table);
      matrixEl.appendChild(wrap);
    }

    function run() {
      clearError();
      try {
        var list = [y1.value, y2.value];
        if (countEl.value === "3") list.push(y3.value);
        var out = compute(list, x0.value);
        amountEl.textContent = out.symbolic && out.determinant !== null ? "W = " + out.determinant : "W(x₀) ≈ " + out.valueText;
        amountEl.style.overflowWrap = "anywhere";
        conclusionEl.textContent = out.conclusion;
        fillMatrix(out.columns);
        detailEl.textContent = out.steps;
        resultEl.classList.add("visible");
      } catch (err) {
        showError(err.message || "Could not compute the Wronskian.");
      }
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      run();
    });
    document.getElementById("w-reset").addEventListener("click", function () {
      countEl.value = "2";
      y1.value = "e^x";
      y2.value = "e^(2x)";
      y3.value = "x^2";
      x0.value = "0";
      showCount();
      clearError();
      resultEl.classList.remove("visible");
    });

    function preset(count, a, b, c, point) {
      countEl.value = String(count);
      y1.value = a;
      y2.value = b;
      y3.value = c;
      x0.value = point;
      showCount();
      run();
    }
    document.getElementById("w-preset-exp").addEventListener("click", function () {
      preset(2, "e^x", "e^(2x)", "x^2", "0");
    });
    document.getElementById("w-preset-trig").addEventListener("click", function () {
      preset(2, "sin x", "cos x", "x^2", "0");
    });
    document.getElementById("w-preset-zero").addEventListener("click", function () {
      preset(2, "x", "x^2", "x^2", "0");
    });
    document.getElementById("w-preset-poly").addEventListener("click", function () {
      preset(3, "1", "x", "x^2", "0");
    });
  }

  return {
    boot: boot,
    parseExpr: parseExpr,
    simplifyText: simplifyText,
    derivativeText: derivativeText,
    compute: compute,
    evalNode: evalNode
  };
});
