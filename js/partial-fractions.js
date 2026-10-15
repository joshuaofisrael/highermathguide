/* Exact partial fraction decomposition. Rational arithmetic, no libraries. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.PartialFractions = api;
  if (typeof document !== "undefined") api.boot();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MINUS = "\u2212";
  var MAX_DEGREE = 8;
  var MAX_NUM_DEGREE = 12;
  var MAX_EXPONENT = 12;
  var LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];
  var VAR_OK = { x: true, y: true, t: true, n: true };

  function gcd(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b !== 0n) {
      var t = a % b;
      a = b;
      b = t;
    }
    return a;
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
    if (g === 0n) g = 1n;
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
  function cmp(a, b) {
    var left = a.n * b.d;
    var right = b.n * a.d;
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  }

  var ZERO = rat(0n, 1n);
  var ONE = rat(1n, 1n);

  function fmt(a) {
    var sign = a.n < 0n ? MINUS : "";
    var n = a.n < 0n ? -a.n : a.n;
    if (a.d === 1n) return sign + n.toString();
    return sign + n.toString() + "/" + a.d.toString();
  }

  function isqrt(n) {
    if (n < 0n) return null;
    if (n < 2n) return n;
    var x = n;
    var y = (x + 1n) / 2n;
    while (y < x) {
      x = y;
      y = (x + n / x) / 2n;
    }
    return x;
  }

  function isPerfectSquare(n) {
    if (n < 0n) return false;
    var s = isqrt(n);
    return s * s === n;
  }

  function trimPoly(p) {
    var q = p.slice();
    while (q.length && isZero(q[q.length - 1])) q.pop();
    return q;
  }

  function deg(p) { return p.length - 1; }

  function polyEq(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (!eq(a[i], b[i])) return false;
    return true;
  }

  function polyScale(p, s) {
    if (isZero(s) || deg(p) < 0) return [];
    return trimPoly(p.map(function (c) { return mul(c, s); }));
  }

  function polyAdd(a, b) {
    var n = Math.max(a.length, b.length);
    var out = [];
    for (var i = 0; i < n; i++) {
      out.push(add(i < a.length ? a[i] : ZERO, i < b.length ? b[i] : ZERO));
    }
    return trimPoly(out);
  }

  function polySub(a, b) { return polyAdd(a, polyScale(b, rat(-1n, 1n))); }

  function polyMul(a, b) {
    if (deg(a) < 0 || deg(b) < 0) return [];
    var out = [];
    for (var i = 0; i < a.length; i++) {
      for (var j = 0; j < b.length; j++) {
        var k = i + j;
        out[k] = out[k] ? add(out[k], mul(a[i], b[j])) : mul(a[i], b[j]);
      }
    }
    return trimPoly(out);
  }

  function polyPow(p, exp) {
    if (exp < 0) {
      throw new Error("Exponents in a polynomial must be nonnegative integers. Put a denominator in the denominator box.");
    }
    if (exp > MAX_EXPONENT) throw new Error("Use an exponent of " + MAX_EXPONENT + " or less.");
    if (exp === 0) return [ONE];
    var result = [ONE];
    var base = p.slice();
    var e = exp;
    while (e > 0) {
      if (e % 2 === 1) result = polyMul(result, base);
      e = Math.floor(e / 2);
      if (e) base = polyMul(base, base);
    }
    return result;
  }

  function polyDiv(num, den) {
    var dd = deg(den);
    if (dd < 0) throw new Error("Division by the zero polynomial.");
    var q = [];
    var r = trimPoly(num.slice());
    var lead = den[dd];
    var guard = 0;
    while (deg(r) >= dd) {
      if (++guard > 40) throw new Error("Polynomial division did not finish.");
      var shift = deg(r) - dd;
      var coef = div(r[deg(r)], lead);
      var mono = [];
      for (var i = 0; i < shift; i++) mono.push(ZERO);
      mono.push(coef);
      q = polyAdd(q, mono);
      r = polySub(r, polyMul(den, mono));
    }
    return { q: trimPoly(q), r: trimPoly(r) };
  }

function polyExactDiv(num, den) {
  var parts = polyDiv(num, den);
  if (deg(parts.r) >= 0) throw new Error("Internal division left a remainder.");
  if (deg(parts.q) < 0) throw new Error("Internal division produced a zero quotient.");
  return parts.q;
}

  function evalPoly(p, x) {
    var acc = ZERO;
    for (var i = p.length - 1; i >= 0; i--) acc = add(mul(acc, x), p[i]);
    return acc;
  }

  function leading(p) { return deg(p) < 0 ? ZERO : p[p.length - 1]; }

  function fmtPoly(p, variable) {
    var v = variable || "x";
    if (deg(p) < 0) return "0";
    var parts = [];
    for (var i = p.length - 1; i >= 0; i--) {
      if (!isZero(p[i])) parts.push({ coef: p[i], deg: i });
    }
    var s = "";
    for (var k = 0; k < parts.length; k++) {
      var c = parts[k].coef;
      var d = parts[k].deg;
      var neg = c.n < 0n;
      var mag = absRat(c);
      var body;
      if (d === 0) body = fmt(mag);
      else {
        var pow = d === 1 ? v : v + "^" + d;
        if (eq(mag, ONE)) body = pow;
        else if (mag.d === 1n) body = fmt(mag) + pow;
        else body = "(" + fmt(mag) + ")" + pow;
      }
      if (k === 0) s += neg ? MINUS + body : body;
      else s += neg ? " " + MINUS + " " + body : " + " + body;
    }
    return s;
  }

  function isBarePower(p) {
    if (deg(p) < 1) return false;
    if (!eq(leading(p), ONE)) return false;
    for (var i = 0; i < p.length - 1; i++) if (!isZero(p[i])) return false;
    return true;
  }

  function fmtFactorBody(p, variable) {
    if (isBarePower(p) && deg(p) === 1) return variable;
    return "(" + fmtPoly(p, variable) + ")";
  }

  function fmtDenom(p, power, variable) {
    if (isBarePower(p) && deg(p) === 1) {
      return power === 1 ? variable : variable + "^" + power;
    }
    var body = "(" + fmtPoly(p, variable) + ")";
    return power === 1 ? body : body + "^" + power;
  }

function needsNumeratorParens(p) {
  if (deg(p) < 0) return false;
  if (deg(p) === 0) return p[0].d !== 1n;
  var nonzero = 0;
  for (var i = 0; i < p.length; i++) if (!isZero(p[i])) nonzero++;
  if (nonzero === 1 && leading(p).n > 0n && leading(p).d === 1n) return false;
  return true;
}

  function fmtFraction(numer, factor, power, variable) {
    var top = fmtPoly(numer, variable);
    if (needsNumeratorParens(numer)) top = "(" + top + ")";
    return top + "/" + fmtDenom(factor, power, variable);
  }

  function splitSign(p) {
    if (deg(p) < 0) return { neg: false, poly: [] };
    if (leading(p).n < 0n) return { neg: true, poly: polyScale(p, rat(-1n, 1n)) };
    return { neg: false, poly: p };
  }

  function joinSigned(parts) {
    if (!parts.length) return "0";
    var s = "";
    for (var i = 0; i < parts.length; i++) {
      if (i === 0) s += parts[i].neg ? MINUS + parts[i].text : parts[i].text;
      else s += parts[i].neg ? " " + MINUS + " " + parts[i].text : " + " + parts[i].text;
    }
    return s;
  }

  function fmtLinComb(coeffs, names) {
    var items = [];
    for (var i = 0; i < coeffs.length; i++) {
      if (!isZero(coeffs[i])) items.push({ c: coeffs[i], name: names[i] });
    }
    if (!items.length) return "0";
    var s = "";
    for (var k = 0; k < items.length; k++) {
      var c = items[k].c;
      var neg = c.n < 0n;
      var mag = absRat(c);
      var body = eq(mag, ONE) ? items[k].name : (mag.d === 1n ? fmt(mag) + items[k].name : "(" + fmt(mag) + ")" + items[k].name);
      if (k === 0) s += neg ? MINUS + body : body;
      else s += neg ? " " + MINUS + " " + body : " + " + body;
    }
    return s;
  }

  function fmtParenNumber(a) {
    if (a.n < 0n) return "(" + fmt(a) + ")";
    return fmt(a);
  }

  function fmtSide(numer, den, variable) {
    var top = fmtPoly(numer, variable);
    var bottom = fmtPoly(den, variable);
    if (!(deg(numer) === 0 && numer[0].d === 1n && numer[0].n > 0n)) top = "(" + top + ")";
    if (deg(den) > 0 || (deg(den) === 0 && den[0].n < 0n)) bottom = "(" + bottom + ")";
    return top + " / " + bottom;
  }

  function powerLabel(power, variable) {
    var v = variable || "x";
    if (power === 0) return "Constant term";
    if (power === 1) return "Coefficient of " + v;
    return "Coefficient of " + v + "^" + power;
  }

  function englishList(items) {
    if (items.length === 0) return "";
    if (items.length === 1) return String(items[0]);
    if (items.length === 2) return items[0] + " and " + items[1];
    return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
  }

  function parseNumberToken(raw) {
    var s = String(raw).replace(/[\u2212\u2013\u2014]/g, "-");
    var m = s.match(/^([+-]?)(?:(\d+)\.(\d*)|\.(\d+)|(\d+))$/);
    if (!m) return null;
    var sign = m[1] === "-" ? -1n : 1n;
    var digits;
    var places;
    if (m[5] != null) {
      digits = m[5];
      places = 0;
    } else if (m[4] != null) {
      digits = m[4];
      places = m[4].length;
    } else {
      digits = m[2] + (m[3] || "");
      places = (m[3] || "").length;
      if (!digits) digits = "0";
    }
    if (digits.length > 40) throw new Error("Use 40 digits or fewer in each number.");
    return rat(sign * BigInt(digits), 10n ** BigInt(places));
  }

  function tokenize(src) {
    var s = String(src).replace(/[\u2212\u2013\u2014]/g, "-");
    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, function (ch) {
      return "^" + "⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(ch);
    });
    var tokens = [];
    var i = 0;
    while (i < s.length) {
      var ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === "+" || ch === "-" || ch === "*" || ch === "^" || ch === "/" || ch === "(" || ch === ")" || ch === "," || ch === "·" || ch === "×") {
        if (ch === "·" || ch === "×") ch = "*";
        tokens.push({ t: ch });
        i++;
        continue;
      }
      if (/[A-Za-z]/.test(ch)) {
        var name = ch.toLowerCase();
        if (!VAR_OK[name]) {
          throw new Error("Use one variable: x, or y, t, or n. This page does not read the letter " + ch + ".");
        }
        tokens.push({ t: "var", name: name });
        i++;
        continue;
      }
      if (/[\d.]/.test(ch)) {
        var j = i;
        while (j < s.length && /[\d.]/.test(s[j])) j++;
        var text = s.slice(i, j);
        if ((text.match(/\./g) || []).length > 1) {
          throw new Error("Could not read the number " + text + ".");
        }
        var value = parseNumberToken(text);
        if (!value) throw new Error("Could not read the number " + text + ".");
        tokens.push({ t: "num", v: value, text: text });
        i = j;
        continue;
      }
      throw new Error("Could not read \"" + ch + "\" in the polynomial.");
    }
    return tokens;
  }

  function looksLikeCoeffList(src) {
    var s = String(src).replace(/[\u2212\u2013\u2014]/g, "-").trim();
    if (!s) return false;
    if (/[A-Za-z(^]/.test(s)) return false;
    if (!/[, ]/.test(s) && !/\s/.test(s)) return false;
    var parts = s.split(/[\s,]+/).filter(Boolean);
    if (parts.length < 2 && s.indexOf(",") === -1) return false;
    for (var i = 0; i < parts.length; i++) {
      if (!/^([+-]?)(\d+\.?\d*|\.\d+)(\/\d+)?$/.test(parts[i])) return false;
    }
    return true;
  }

  function parseCoeffNumber(text) {
    var s = text.replace(/[\u2212\u2013\u2014]/g, "-");
    var frac = s.match(/^([+-]?)(\d+)\/(\d+)$/);
    if (frac) {
      if (frac[2].length > 40 || frac[3].length > 40) throw new Error("Use 40 digits or fewer in each number.");
      var d = BigInt(frac[3]);
      if (d === 0n) throw new Error("A coefficient has a zero denominator.");
      var n = BigInt((frac[1] === "-" ? "-" : "") + frac[2]);
      return rat(n, d);
    }
    var value = parseNumberToken(s);
    if (!value) throw new Error("Could not read the coefficient " + text + ".");
    return value;
  }

  function parsePolynomial(input, role) {
    var original = String(input == null ? "" : input).trim();
    if (!original) throw new Error("Enter a " + role + ".");
    if (looksLikeCoeffList(original)) {
      var parts = original.replace(/[\u2212\u2013\u2014]/g, "-").trim().split(/[\s,]+/).filter(Boolean);
      var high = parts.map(parseCoeffNumber);
      var low = high.slice().reverse();
      return { poly: trimPoly(low), variable: "x", coeffList: true, raw: original };
    }
    var tokens = tokenize(original);
    if (!tokens.length) throw new Error("Enter a " + role + ".");
    var i = 0;
    var variable = null;
    function peek() { return i < tokens.length ? tokens[i] : null; }
    function peekIs(t) { return peek() && peek().t === t; }
    function next() { return tokens[i++]; }
    function expect(t, msg) {
      if (!peekIs(t)) throw new Error(msg || "The " + role + " is missing a \"" + t + "\".");
      return next();
    }
    function noteVar(name) {
      if (variable && variable !== name) {
        throw new Error("Use only one variable. This expression uses both " + variable + " and " + name + ".");
      }
      variable = name;
    }
    function parseExpr() {
      var sign = ONE;
      if (peekIs("+") || peekIs("-")) {
        if (next().t === "-") sign = rat(-1n, 1n);
      }
      if (!peek()) throw new Error("The " + role + " ends early. Finish the last term.");
      var p = polyScale(parseTerm(), sign);
      while (peekIs("+") || peekIs("-")) {
        var op = next().t;
        if (!peek() || peekIs("+") || peekIs("-") || peekIs(")")) {
          throw new Error("The " + role + " has a sign with no term after it.");
        }
        var term = parseTerm();
        p = op === "-" ? polySub(p, term) : polyAdd(p, term);
      }
      return p;
    }
    function numericFollowsSlash() {
      if (!peekIs("/")) return false;
      var nxt = tokens[i + 1];
      return !!(nxt && (nxt.t === "num" || nxt.t === "("));
    }
    function parseNumericConstant() {
      if (peekIs("(")) {
        next();
        var inside = parseExpr();
        expect(")", "A parenthesis in the " + role + " is not closed.");
        if (deg(inside) > 0) {
          throw new Error("A slash in the " + role + " only divides by a number. Put the polynomial denominator in the denominator box.");
        }
        return deg(inside) < 0 ? ZERO : inside[0];
      }
      if (!peekIs("num")) {
        throw new Error("A slash in the " + role + " only divides by a number. Put the polynomial denominator in the denominator box.");
      }
      return next().v;
    }
    function parseTerm() {
      var p = parsePow();
      while (true) {
        if (numericFollowsSlash()) {
          next();
          var divisor = parseNumericConstant();
          if (isZero(divisor)) throw new Error("Division by zero in the " + role + ".");
          p = polyScale(p, div(ONE, divisor));
          continue;
        }
        if (peekIs("*")) {
          next();
          p = polyMul(p, parsePow());
          continue;
        }
        if (peekIs("num") || peekIs("var") || peekIs("(")) {
          p = polyMul(p, parsePow());
          continue;
        }
        break;
      }
      return p;
    }
    function parsePow() {
      var base = parseBase();
      if (peekIs("^")) {
        next();
        var exp = readExponent();
        base = polyPow(base, exp);
      }
      return base;
    }
    function readExponent() {
      if (peekIs("(")) {
        next();
        var inner = readSignedInteger();
        expect(")", "Close the parenthesis around the exponent.");
        return inner;
      }
      return readSignedInteger();
    }
    function readSignedInteger() {
      var sign = 1;
      if (peekIs("+")) next();
      else if (peekIs("-")) { next(); sign = -1; }
      if (!peekIs("num")) throw new Error("An exponent must be a nonnegative integer.");
      var value = next().v;
      if (value.d !== 1n) throw new Error("An exponent must be a nonnegative integer.");
      var n = Number(value.n);
      if (!Number.isSafeInteger(n)) throw new Error("That exponent is too large.");
      return sign * n;
    }
    function parseBase() {
      if (peekIs("num")) return constantPoly(next().v);
      if (peekIs("var")) {
        noteVar(next().name);
        return [ZERO, ONE];
      }
      if (peekIs("(")) {
        next();
        var inside = parseExpr();
        expect(")", "A parenthesis in the " + role + " is not closed.");
        return inside;
      }
      if (peekIs("/")) {
        throw new Error("A slash in the " + role + " only divides by a number. Put the polynomial denominator in the denominator box.");
      }
      throw new Error("Could not read the " + role + " near the end of \"" + original + "\".");
    }
    var poly = parseExpr();
    if (peek()) throw new Error("Could not read the rest of the " + role + ": \"" + original.slice(Math.max(0, original.length - 24)) + "\".");
    return { poly: trimPoly(poly), variable: variable || "x", coeffList: false, raw: original };
  }

  function constantPoly(r) {
    return isZero(r) ? [] : [r];
  }

  function trimBig(a) {
    var q = a.slice();
    while (q.length > 1 && q[q.length - 1] === 0n) q.pop();
    if (q.length === 1 && q[0] === 0n) return [];
    return q;
  }

  function degBig(a) { return a.length - 1; }

  function divisors(n) {
    n = n < 0n ? -n : n;
    if (n === 0n) return [];
    var small = [];
    var large = [];
    for (var i = 1n; i * i <= n; i++) {
      if (n % i === 0n) {
        small.push(i);
        if (i * i !== n) large.push(n / i);
      }
    }
    large.reverse();
    return small.concat(large);
  }

  function evalAtRoot(coeffs, p, q) {
    var n = coeffs.length - 1;
    var acc = coeffs[n];
    var qpow = 1n;
    for (var i = n - 1; i >= 0; i--) {
      qpow *= q;
      acc = acc * p + coeffs[i] * qpow;
    }
    return acc;
  }

  function exactDivideBig(num, den) {
    if (!den.length) return null;
    var n = num.slice();
    var ddeg = den.length - 1;
    var lead = den[ddeg];
    if (lead === 0n) return null;
    var q = [];
    var guard = 0;
    while (degBig(n) >= ddeg) {
      if (++guard > 40) return null;
      var shift = degBig(n) - ddeg;
      var ln = n[n.length - 1];
      if (ln % lead !== 0n) return null;
      var coef = ln / lead;
      while (q.length <= shift) q.push(0n);
      q[shift] += coef;
      for (var i = 0; i < den.length; i++) n[i + shift] -= coef * den[i];
      n = trimBig(n);
      if (!n.length) break;
    }
    if (n.length) return null;
    return q.length ? q : [0n];
  }

  function findRationalRoot(coeffs) {
    if (!coeffs.length) return null;
    if (coeffs[0] === 0n) return { p: 0n, q: 1n };
    var lead = coeffs[coeffs.length - 1];
    var ps = divisors(coeffs[0]);
    var qs = divisors(lead);
    var cands = [];
    for (var qi = 0; qi < qs.length; qi++) {
      for (var pi = 0; pi < ps.length; pi++) {
        var pp = ps[pi];
        var qq = qs[qi];
        if (gcd(pp, qq) !== 1n) continue;
        cands.push({ p: pp, q: qq });
        cands.push({ p: -pp, q: qq });
      }
    }
    cands.sort(function (a, b) {
      var as = a.p < 0n ? -a.p : a.p;
      var bs = b.p < 0n ? -b.p : b.p;
      if (as + a.q !== bs + b.q) return as + a.q < bs + b.q ? -1 : 1;
      if (a.q !== b.q) return a.q < b.q ? -1 : 1;
      if (a.p === b.p) return 0;
      return a.p < b.p ? -1 : 1;
    });
    for (var i = 0; i < cands.length; i++) {
      if (evalAtRoot(coeffs, cands[i].p, cands[i].q) === 0n) return cands[i];
    }
    return null;
  }

  function coeffBound(coeffs) {
    var s = 0n;
    for (var i = 0; i < coeffs.length; i++) s += coeffs[i] * coeffs[i];
    var floor = isqrt(s);
    var ceil = floor * floor === s ? floor : floor + 1n;
    return 4n * ceil + 2n;
  }

  function findQuadraticFactor(coeffs) {
    var lead = coeffs[coeffs.length - 1];
    var constant = coeffs[0];
    if (constant === 0n || lead === 0n) return null;
    var as = divisors(lead);
    var cs = divisors(constant);
    var bound = coeffBound(coeffs);
    var cap = bound > 200n ? 200n : bound;
    var trialBudget = as.length * cs.length * 2 * Number(cap) * 2;
    if (trialBudget > 500000) {
      throw new Error("The coefficients are large enough that an exact search for quadratic factors would stall the page. Enter a denominator with smaller coefficients, or type the factors yourself, such as (x^2+1)(x^2+4).");
    }
    for (var ai = 0; ai < as.length; ai++) {
      var a = as[ai];
      for (var ci = 0; ci < cs.length; ci++) {
        var cAbs = cs[ci];
        for (var s = 0; s < 2; s++) {
          var c = s === 0 ? cAbs : -cAbs;
          for (var bAbs = 0n; bAbs <= cap; bAbs++) {
            var bs = bAbs === 0n ? [0n] : [bAbs, -bAbs];
            for (var bi = 0; bi < bs.length; bi++) {
              var b = bs[bi];
              var g = gcd(a, gcd(b < 0n ? -b : b, c < 0n ? -c : c));
              if (g !== 1n) continue;
              var factor = [c, b, a];
              var quot = exactDivideBig(coeffs, factor);
              if (quot && quot.length) return { factor: factor, quot: quot, capped: cap < bound };
            }
          }
        }
      }
    }
    if (cap < bound) {
      throw new Error("No quadratic factor with coefficients up to " + cap.toString() + " divides the remaining polynomial. The Mignotte bound is larger than this page searches. Factor the denominator by hand and enter the product, or use smaller coefficients.");
    }
    return null;
  }

  function bigPolyToRat(coeffs) {
    return trimPoly(coeffs.map(function (c) { return rat(c, 1n); }));
  }

  function fmtBigPoly(coeffs, variable) {
    return fmtPoly(bigPolyToRat(coeffs), variable);
  }

  function discOf(coeffs) {
    return coeffs[1] * coeffs[1] - 4n * coeffs[2] * coeffs[0];
  }

  function toPrimitive(poly) {
    if (deg(poly) < 0) return { coeffs: [], scale: ONE };
    var lcm = 1n;
    for (var i = 0; i < poly.length; i++) {
      if (isZero(poly[i])) continue;
      lcm = lcm / gcd(lcm, poly[i].d) * poly[i].d;
    }
    var ints = poly.map(function (c) { return c.n * (lcm / c.d); });
    var g = 0n;
    for (var j = 0; j < ints.length; j++) g = gcd(g, ints[j]);
    if (g === 0n) g = 1n;
    var lead = ints[ints.length - 1];
    var sign = lead < 0n ? -1n : 1n;
    var prim = ints.map(function (c) { return (c / g) * sign; });
    for (var k = 0; k < prim.length; k++) {
      var mag = prim[k] < 0n ? -prim[k] : prim[k];
      if (mag > 999999999n) {
        throw new Error("A coefficient is larger than 9 digits after clearing denominators. This page factors smaller textbook polynomials.");
      }
    }
    return { coeffs: prim, scale: rat(sign * g, lcm) };
  }

  function factorPrimitive(coeffs, variable) {
    var lines = [];
    var factors = [];
    var work = coeffs.slice();
    var v = variable || "x";

    function pushLinear(linear, mult) {
      factors.push({ kind: "linear", poly: linear.slice(), mult: mult });
    }

    while (degBig(work) >= 1) {
      if (work[0] === 0n) {
        var mx = 0;
        while (work.length && work[0] === 0n) {
          work = work.slice(1);
          mx++;
        }
        pushLinear([0n, 1n], mx);
        lines.push(mx === 1
          ? "The constant term is 0, so " + v + " is a factor."
          : "The constant term is 0, and " + v + " divides the polynomial " + mx + " times.");
        continue;
      }
      if (degBig(work) === 1) {
        pushLinear(work.slice(), 1);
        lines.push("The remaining factor " + fmtBigPoly(work, v) + " is linear.");
        work = [1n];
        break;
      }
      var root = findRationalRoot(work);
      if (!root) break;
      if (!lines.some(function (line) { return line.indexOf("rational root theorem") !== -1; })) {
        lines.push("By the rational root theorem, any rational root p/q in lowest terms has p dividing the constant term " + fmt(rat(work[0], 1n)) + " and q dividing the leading coefficient " + fmt(rat(work[work.length - 1], 1n)) + ".");
      }
      var linear = [-root.p, root.q];
      var mult = 0;
      var before = work.slice();
      while (true) {
        var quot = exactDivideBig(work, linear);
        if (!quot) break;
        work = quot;
        mult++;
      }
      if (!mult) {
        throw new Error("A rational root of " + fmtBigPoly(before, v) + " did not divide it exactly.");
      }
      pushLinear(linear, mult);
      var rootText = fmt(rat(root.p, root.q));
      var factorText = fmtBigPoly(linear, v);
      lines.push("The rational root theorem produces a root " + v + " = " + rootText + ", so " + factorText + " is a factor" + (mult > 1 ? ", and it divides " + mult + " times" : "") + ".");
      lines.push("Dividing " + fmtBigPoly(before, v) + " by " + (mult === 1 ? "(" + factorText + ")" : "(" + factorText + ")^" + mult) + " leaves " + (work.length === 1 && work[0] === 1n ? "1" : fmtBigPoly(work, v)) + ".");
    }

    var factorGuard = 0;
    while (degBig(work) >= 2) {
      if (++factorGuard > 16) throw new Error("Factoring did not finish.");
      if (degBig(work) === 2) {
        var disc = discOf(work);
        if (isPerfectSquare(disc)) {
          var split = linearsFromQuadratic(work);
          if (!split) throw new Error("The quadratic " + fmtBigPoly(work, v) + " should have split into rational roots.");
          pushLinear(split[0], split[0].join() === split[1].join() ? 2 : 1);
          if (split[0].join() !== split[1].join()) pushLinear(split[1], 1);
          lines.push("The quadratic " + fmtBigPoly(work, v) + " has rational roots, so it splits into linear factors.");
          work = [1n];
          break;
        }
        factors.push({ kind: "quadratic", poly: work.slice(), mult: 1 });
        lines.push(quadraticSentence(work, v));
        work = [1n];
        break;
      }
      if (degBig(work) === 3) {
        throw new Error("After the rational roots are removed, " + fmtBigPoly(work, v) + " remains. A cubic with no rational root does not factor into linear factors and quadratics with rational coefficients. This page decomposes denominators that do factor that way.");
      }
      var found = findQuadraticFactor(work);
      if (!found) {
        throw new Error("The factor " + fmtBigPoly(work, v) + " has no rational root and no quadratic factor with rational coefficients that this page could find. Partial fractions here need linear factors and irreducible quadratics.");
      }
      var qmult = 0;
      var qbefore = work.slice();
      var piece = found.factor;
      while (true) {
        var qquot = exactDivideBig(work, piece);
        if (!qquot) break;
        work = qquot;
        qmult++;
      }
      var qdisc = discOf(piece);
      if (isPerfectSquare(qdisc)) {
        var splitQ = linearsFromQuadratic(piece);
        if (!splitQ) throw new Error("A quadratic factor should have split into rational roots.");
        var sameRoot = splitQ[0].join() === splitQ[1].join();
        pushLinear(splitQ[0], sameRoot ? 2 * qmult : qmult);
        if (!sameRoot) pushLinear(splitQ[1], qmult);
        lines.push("(" + fmtBigPoly(piece, v) + ") factors further into linear factors with rational roots.");
        continue;
      }
      factors.push({ kind: "quadratic", poly: piece.slice(), mult: qmult });
      lines.push("No rational root remains in " + fmtBigPoly(qbefore, v) + ". An integer quadratic that divides it is " + fmtBigPoly(piece, v) + (qmult > 1 ? ", with multiplicity " + qmult : "") + ".");
      lines.push("The quotient is " + (degBig(work) < 0 || (work.length === 1 && work[0] === 1n) ? "1" : fmtBigPoly(work, v)) + ".");
      lines.push(quadraticSentence(piece, v));
    }

    if (!(work.length === 1 && work[0] === 1n) && degBig(work) > 0) {
      throw new Error("Factoring stopped before the denominator was a product of linear and quadratic factors.");
    }
    var merged = mergeFactors(factors);
    var constant = 1n;
    if (work.length === 1 && work[0] !== 1n && work[0] !== 0n) constant = work[0];
    return { factors: merged, constant: constant, lines: lines };
  }

  function sameBigPoly(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function mergeFactors(factors) {
    var out = [];
    for (var i = 0; i < factors.length; i++) {
      var found = null;
      for (var j = 0; j < out.length; j++) {
        if (out[j].kind === factors[i].kind && sameBigPoly(out[j].poly, factors[i].poly)) found = out[j];
      }
      if (found) found.mult += factors[i].mult;
      else out.push({ kind: factors[i].kind, poly: factors[i].poly.slice(), mult: factors[i].mult });
    }
    return out;
  }

  function linearsFromQuadratic(quad) {
    var a = quad[2];
    var b = quad[1];
    var c = quad[0];
    var disc = b * b - 4n * a * c;
    if (!isPerfectSquare(disc)) return null;
    var s = isqrt(disc);
    function toLinear(num, den) {
      if (den < 0n) {
        num = -num;
        den = -den;
      }
      var g = gcd(num < 0n ? -num : num, den);
      if (g === 0n) g = 1n;
      return [-(num / g), den / g];
    }
    return [toLinear(-b + s, 2n * a), toLinear(-b - s, 2n * a)];
  }

  function multiplyBig(a, b) {
    var out = [];
    for (var i = 0; i < a.length; i++) {
      for (var j = 0; j < b.length; j++) {
        var k = i + j;
        out[k] = (out[k] || 0n) + a[i] * b[j];
      }
    }
    return trimBig(out);
  }

  function quadraticSentence(coeffs, variable) {
    var disc = discOf(coeffs);
    var name = fmtBigPoly(coeffs, variable);
    var a = coeffs[2];
    var b = coeffs[1];
    var c = coeffs[0];
    var discText = fmt(rat(disc, 1n));
    var bText = b < 0n ? "(" + fmt(rat(b, 1n)) + ")" : fmt(rat(b, 1n));
    var cText = c < 0n ? "(" + fmt(rat(c, 1n)) + ")" : fmt(rat(c, 1n));
    return "The quadratic " + name + " has discriminant " + bText + "^2 " + MINUS + " 4·" + fmt(rat(a, 1n)) + "·" + cText + " = " + discText + ". That integer is not a perfect square, so the quadratic has no rational root and stays in one piece.";
  }

  function rootOfLinear(poly) {
    if (typeof poly[0] === "bigint") return rat(-poly[0], poly[1]);
    return div(neg(poly[0]), poly[1]);
  }

  function compareFactors(a, b) {
    if (a.kind !== b.kind) return a.kind === "linear" ? -1 : 1;
    if (a.kind === "linear") return cmp(rootOfLinear(bigPolyToRat(a.poly)), rootOfLinear(bigPolyToRat(b.poly)));
    for (var i = 2; i >= 0; i--) {
      if (a.poly[i] !== b.poly[i]) return a.poly[i] < b.poly[i] ? -1 : 1;
    }
    return 0;
  }

  function productOfFactors(factors) {
    var p = [ONE];
    for (var i = 0; i < factors.length; i++) {
      var fp = bigPolyToRat(factors[i].poly);
      for (var k = 0; k < factors[i].mult; k++) p = polyMul(p, fp);
    }
    return p;
  }

  function fmtFactored(factors, scale, variable) {
    var parts = [];
    if (!eq(scale, ONE)) parts.push(needsBareScale(scale) ? fmt(scale) : "(" + fmt(scale) + ")");
    var ordered = factors.slice().sort(compareFactors);
    for (var i = 0; i < ordered.length; i++) {
      parts.push(fmtDenom(bigPolyToRat(ordered[i].poly), ordered[i].mult, variable));
    }
    return parts.join("");
  }

  function needsBareScale(scale) {
    return scale.d === 1n && scale.n > 0n;
  }

  function buildTerms(factors, variable) {
    var ordered = factors.slice().sort(compareFactors);
    var p = productOfFactors(ordered);
    var terms = [];
    var letter = 0;
    for (var i = 0; i < ordered.length; i++) {
      var factor = ordered[i];
      var fp = bigPolyToRat(factor.poly);
      for (var k = 1; k <= factor.mult; k++) {
        var divisor = fp.slice();
        for (var t = 1; t < k; t++) divisor = polyMul(divisor, fp);
        var cofactor = polyExactDiv(p, divisor);
        if (factor.kind === "linear") {
          if (letter >= LETTERS.length) throw new Error("Too many unknown coefficients.");
          terms.push({
            kind: "linear",
            names: [LETTERS[letter++]],
            factor: fp,
            power: k,
            cofactor: cofactor,
            known: null
          });
        } else {
          if (letter + 1 >= LETTERS.length) throw new Error("Too many unknown coefficients.");
          terms.push({
            kind: "quadratic",
            names: [LETTERS[letter++], LETTERS[letter++]],
            factor: fp,
            power: k,
            cofactor: cofactor,
            known: null
          });
        }
      }
    }
    return { terms: terms, monicProduct: p, ordered: ordered };
  }

  function termColumns(term, variable) {
    if (term.kind === "linear") return [term.cofactor];
    var x = [ZERO, ONE];
    return [polyMul(x, term.cofactor), term.cofactor];
  }

  function contributionSentence(term, variable) {
    var cof = term.cofactor;
    var bare = deg(cof) === 0 && eq(cof[0], ONE);
    if (term.kind === "linear") {
      if (bare) return term.names[0] + " is the whole numerator of its fraction, because that denominator power is the entire factored denominator.";
      return term.names[0] + " multiplies " + fmtPoly(cof, variable) + ".";
    }
    var head = "(" + term.names[0] + variable + " + " + term.names[1] + ")";
    if (bare) return head + " is already the numerator over that power of the quadratic.";
    return head + " multiplies " + fmtPoly(cof, variable) + ".";
  }

  function templatePiece(term, variable) {
    if (term.kind === "linear") {
      return term.names[0] + "/" + fmtDenom(term.factor, term.power, variable);
    }
    var numer = term.names[0] + variable + " + " + term.names[1];
    return "(" + numer + ")/" + fmtDenom(term.factor, term.power, variable);
  }

  function solvedNumerator(term, valuesByName) {
    if (term.kind === "linear") {
      var a = valuesByName[term.names[0]];
      return isZero(a) ? [] : [a];
    }
    var b = valuesByName[term.names[0]];
    var c = valuesByName[term.names[1]];
    return trimPoly([c, b]);
  }

  function fmtSummary(quotient, terms, valuesByName, variable) {
    var parts = [];
    if (deg(quotient) >= 0) parts.push({ neg: false, text: fmtPoly(quotient, variable) });
    for (var i = 0; i < terms.length; i++) {
      var numer = solvedNumerator(terms[i], valuesByName);
      if (deg(numer) < 0) continue;
      var signed = splitSign(numer);
      parts.push({
        neg: signed.neg,
        text: fmtFraction(signed.poly, terms[i].factor, terms[i].power, variable)
      });
    }
    return joinSigned(parts);
  }

  function divideWithSteps(num, den, variable) {
    var lines = [];
    var nd = deg(num);
    var dd = deg(den);
    lines.push("The numerator has degree " + (nd < 0 ? 0 : nd) + " and the denominator has degree " + dd + ".");
    if (nd < dd) {
      lines.push(nd < 0
        ? "The numerator is 0, so the rational function is 0."
        : "The degree of the numerator is smaller, so the fraction is proper. There is no polynomial quotient to split off.");
      return { q: [], r: num.slice(), lines: lines };
    }
    lines.push("The fraction is improper. Divide first.");
    lines.push("");
    lines.push("Divide " + fmtPoly(num, variable) + " by " + fmtPoly(den, variable) + ".");
    var q = [];
    var r = trimPoly(num.slice());
    var step = 0;
    var guard = 0;
    while (deg(r) >= dd) {
      if (++guard > 40) throw new Error("Polynomial division did not finish.");
      var shift = deg(r) - dd;
      var coef = div(r[deg(r)], den[dd]);
      var mono = [];
      for (var i = 0; i < shift; i++) mono.push(ZERO);
      mono.push(coef);
      var prod = polyMul(den, mono);
      step += 1;
      lines.push(step + ". Divide the leading term " + fmtPoly(monoFrom(r), variable) + " by the leading term " + fmtPoly(monoFrom(den), variable) + ". The quotient term is " + fmtPoly(mono, variable) + ".");
      lines.push("Multiply " + fmtPoly(mono, variable) + " by " + fmtPoly(den, variable) + " to get " + fmtPoly(prod, variable) + ".");
      r = polySub(r, prod);
      q = polyAdd(q, mono);
      lines.push("Subtract. The new remainder is " + fmtPoly(r, variable) + ".");
    }
    lines.push("");
    lines.push("The remainder has degree " + (deg(r) < 0 ? "below 0" : String(deg(r))) + ", which is less than " + dd + ", so division stops.");
    lines.push("Quotient: " + fmtPoly(q, variable));
    lines.push("Remainder: " + fmtPoly(r, variable));
    var rebuilt = polyAdd(polyMul(q, den), r);
    if (!polyEq(rebuilt, trimPoly(num))) throw new Error("Division check failed.");
    lines.push("Check the division: (" + fmtPoly(q, variable) + ")(" + fmtPoly(den, variable) + ") + (" + fmtPoly(r, variable) + ") = " + fmtPoly(rebuilt, variable) + ".");
    return { q: q, r: r, lines: lines };
  }

  function monoFrom(p) {
    if (deg(p) < 0) return [];
    var mono = [];
    for (var i = 0; i < deg(p); i++) mono.push(ZERO);
    mono.push(p[deg(p)]);
    return mono;
  }

  function polyGcd(a, b) {
    var A = deg(a) >= 0 ? polyScale(a, div(ONE, leading(a))) : [];
    var B = deg(b) >= 0 ? polyScale(b, div(ONE, leading(b))) : [];
    var guard = 0;
    while (deg(B) >= 0) {
      if (++guard > 40) throw new Error("The polynomial gcd did not finish.");
      var r = polyDiv(A, B).r;
      A = B;
      B = deg(r) >= 0 ? polyScale(r, div(ONE, leading(r))) : [];
    }
    return A;
  }

function rrefSolve(rows, rhs, names, labels, title) {
  var n = names.length;
  var m = rows.length;
  if (!n || m < n) {
    throw new Error("The coefficient system has no unique solution. The denominator may not have factored completely.");
  }
  var M = [];
  for (var i = 0; i < m; i++) {
    if (!rows[i] || rows[i].length !== n) throw new Error("Internal system shape.");
    M.push(rows[i].slice().concat([rhs[i]]));
  }
  var lab = labels.slice();
  var lines = [];
  function dump() {
    var out = [];
    for (var r = 0; r < m; r++) {
      out.push(lab[r] + ": " + fmtLinComb(M[r].slice(0, n), names) + " = " + fmt(M[r][n]));
    }
    return out;
  }
lines.push(title || "Match coefficients.");
    lines = lines.concat(dump());
  var step = 0;
  function record(sentence) {
    step += 1;
    lines.push(step + ". " + sentence);
    lines = lines.concat(dump());
  }
  var pivotRow = 0;
  for (var col = 0; col < n; col++) {
    var pivot = -1;
    var best = null;
    for (var r = pivotRow; r < m; r++) {
      if (isZero(M[r][col])) continue;
      var score = absRat(M[r][col]).n + absRat(M[r][col]).d;
      if (pivot < 0 || score < best) {
        pivot = r;
        best = score;
      }
    }
    if (pivot < 0) {
      throw new Error("The coefficient system has no unique solution. The denominator may not have factored completely.");
    }
    if (pivot !== pivotRow) {
      var tmp = M[pivotRow];
      M[pivotRow] = M[pivot];
      M[pivot] = tmp;
      var tl = lab[pivotRow];
      lab[pivotRow] = lab[pivot];
      lab[pivot] = tl;
      record("Swap two equations so " + names[col] + " has a pivot.");
    }
    if (!eq(M[pivotRow][col], ONE)) {
      var piv = M[pivotRow][col];
      for (var c = col; c <= n; c++) M[pivotRow][c] = div(M[pivotRow][c], piv);
      record("Divide the " + lab[pivotRow].toLowerCase() + " equation by " + fmt(piv) + " so the coefficient of " + names[col] + " is 1.");
    }
    for (var rr = 0; rr < m; rr++) {
      if (rr === pivotRow || isZero(M[rr][col])) continue;
      var factor = M[rr][col];
      for (var cc = col; cc <= n; cc++) M[rr][cc] = sub(M[rr][cc], mul(factor, M[pivotRow][cc]));
      if (factor.n < 0n) {
        var addMag = absRat(factor);
        record((eq(addMag, ONE) ? "Add the equation that isolates " + names[col] : "Add " + fmt(addMag) + " times the equation that isolates " + names[col]) + " to the " + lab[rr].toLowerCase() + " equation, to clear " + names[col] + ".");
      } else if (eq(factor, ONE)) {
        record("Subtract the equation that isolates " + names[col] + " from the " + lab[rr].toLowerCase() + " equation, to clear " + names[col] + ".");
      } else {
        record("Subtract " + fmt(factor) + " times the equation that isolates " + names[col] + " from the " + lab[rr].toLowerCase() + " equation, to clear " + names[col] + ".");
      }
    }
    pivotRow += 1;
  }
  for (var extra = pivotRow; extra < m; extra++) {
    var stray = false;
    for (var sc = 0; sc < n; sc++) if (!isZero(M[extra][sc])) stray = true;
    if (stray || !isZero(M[extra][n])) {
      throw new Error("The coefficient equations disagree. The denominator may not have factored completely.");
    }
  }
  var solution = [];
  for (var s = 0; s < n; s++) solution.push(M[s][n]);
  return { solution: solution, lines: lines };
}

  function coverValue(rem, scale, cofactor, root) {
    var numAt = evalPoly(rem, root);
    var cofAt = evalPoly(cofactor, root);
    if (isZero(cofAt)) throw new Error("Cover-up hit a zero cofactor. The multiplicity is wrong.");
    var denom = mul(scale, cofAt);
    return { numAt: numAt, cofAt: cofAt, value: div(numAt, denom) };
  }

  function decompose(numText, denText) {
    var numParsed = parsePolynomial(numText, "numerator");
    var denParsed = parsePolynomial(denText, "denominator");
    var variable = "x";
    if (numParsed.variable !== "x" && denParsed.variable !== "x" && numParsed.variable !== denParsed.variable && deg(numParsed.poly) > 0 && deg(denParsed.poly) > 0) {
      throw new Error("Use the same variable in the numerator and the denominator.");
    }
    if (deg(numParsed.poly) > 0) variable = numParsed.variable;
    if (deg(denParsed.poly) > 0) {
      if (deg(numParsed.poly) > 0 && numParsed.variable !== denParsed.variable) {
        throw new Error("Use the same variable in the numerator and the denominator.");
      }
      variable = denParsed.variable;
    }
    var num = numParsed.poly;
    var den = denParsed.poly;
    var originalNum = num.slice();
    var originalDen = den.slice();
    if (deg(num) > MAX_NUM_DEGREE) {
      throw new Error("Use a numerator of degree " + MAX_NUM_DEGREE + " or less.");
    }
    if (deg(den) > MAX_DEGREE) {
      throw new Error("Use a denominator of degree " + MAX_DEGREE + " or less.");
    }
    if (deg(den) < 0) throw new Error("The denominator cannot be zero.");

    var lines = [];
    lines.push("Numerator: " + fmtPoly(num, variable) + ".");
    lines.push("Denominator: " + fmtPoly(den, variable) + ".");
    if (numParsed.coeffList || denParsed.coeffList) {
      lines.push("A list of numbers is read from the highest power down to the constant term.");
    }
    lines.push("");

    if (deg(den) === 0) {
      var scaled = polyScale(num, div(ONE, den[0]));
      lines.push("The denominator is the constant " + fmt(den[0]) + ". Divide the numerator by that constant.");
      lines.push("Result: " + fmtPoly(scaled, variable) + ".");
      return { summary: fmtPoly(scaled, variable), lines: lines, variable: variable };
    }

    var division = divideWithSteps(num, den, variable);
    lines = lines.concat(division.lines);
    lines.push("");
    var quotient = division.q;
    var rem = division.r;
    if (deg(rem) < 0) {
      lines.push("The remainder is 0, so the rational function is the polynomial " + fmtPoly(quotient, variable) + ".");
      return { summary: fmtPoly(quotient, variable), lines: lines, variable: variable };
    }

    var g = polyGcd(rem, den);
    if (deg(g) > 0) {
      lines.push("The numerator of the proper fraction and the denominator have a common factor " + fmtPoly(g, variable) + ".");
      var remCancel = polyExactDiv(rem, g);
      var denCancel = polyExactDiv(den, g);
      var leadFix = leading(denCancel);
      if (leadFix.n < 0n) {
        remCancel = polyScale(remCancel, rat(-1n, 1n));
        denCancel = polyScale(denCancel, rat(-1n, 1n));
      }
      lines.push("Cancel it. The proper fraction becomes (" + fmtPoly(remCancel, variable) + ") / (" + fmtPoly(denCancel, variable) + ").");
      lines.push("The canceled roots are not in the domain of the original expression. The two rational functions agree at every other point.");
      lines.push("");
      rem = remCancel;
      den = denCancel;
      if (deg(den) < 0) throw new Error("Cancellation removed the whole denominator.");
      if (deg(den) === 0) {
        var only = polyAdd(quotient, polyScale(rem, div(ONE, den[0])));
        lines.push("After cancellation the denominator is constant, so the result is the polynomial " + fmtPoly(only, variable) + ".");
        return { summary: fmtPoly(only, variable), lines: lines, variable: variable };
      }
    }

    lines.push("Factor the denominator " + fmtPoly(den, variable) + ".");
    var primitive = toPrimitive(den);
    if (!eq(primitive.scale, ONE) || primitive.coeffs[primitive.coeffs.length - 1] !== 1n) {
      lines.push("Clear denominators in the coefficients and make the leading coefficient positive. The denominator is " + fmt(primitive.scale) + " times " + fmtBigPoly(primitive.coeffs, variable) + ".");
    }
    var factored = factorPrimitive(primitive.coeffs, variable);
    var scale = mul(primitive.scale, rat(factored.constant, 1n));
    lines = lines.concat(factored.lines);
    var product = productOfFactors(factored.factors);
    var rebuiltDen = polyScale(product, scale);
    if (!polyEq(rebuiltDen, den)) {
      throw new Error("The factored denominator does not multiply back to the original denominator.");
    }
    lines.push("Factored denominator: " + fmtFactored(factored.factors, scale, variable) + ".");
    lines.push("Expanding that product returns " + fmtPoly(den, variable) + ".");
    lines.push("");

    var built = buildTerms(factored.factors, variable);
    var terms = built.terms;
    if (!terms.length) throw new Error("There are no factors to decompose.");

    var properName = fmtSide(rem, den, variable);
    var template = terms.map(function (term) { return templatePiece(term, variable); }).join(" + ");
    lines.push("Set up the partial fractions.");
    lines.push(properName + " = " + template + ".");
    if (!eq(scale, ONE)) {
      lines.push("The constant " + fmt(scale) + " stays with the denominator. Each unknown is solved against that constant times the other factors.");
    }
    lines.push("");

    var values = {};
    var known = {};
    for (var ti = 0; ti < terms.length; ti++) {
      var term = terms[ti];
      if (term.kind === "linear" && term.power === factorMult(factored.factors, term.factor)) {
        var root = rootOfLinear(term.factor);
        var cover = coverValue(rem, scale, term.cofactor, root);
        known[term.names[0]] = cover.value;
        values[term.names[0]] = cover.value;
        lines.push("Cover " + fmtDenom(term.factor, term.power, variable) + " and substitute " + variable + " = " + fmt(root) + ".");
        var divisorThere = mul(scale, cover.cofAt);
        if (eq(scale, ONE)) {
          lines.push("The numerator there is " + fmt(cover.numAt) + ". The other factors, evaluated at that root, equal " + fmt(cover.cofAt) + ".");
        } else {
          lines.push("The numerator there is " + fmt(cover.numAt) + ". The other factors equal " + fmt(cover.cofAt) + ", and the constant in front of the denominator is " + fmt(scale) + ".");
        }
        lines.push(term.names[0] + " = " + fmtParenNumber(cover.numAt) + " / " + fmtParenNumber(divisorThere) + " = " + fmt(cover.value) + ".");
        lines.push("");
      }
    }

    var allKnown = terms.every(function (term) {
      return term.names.every(function (name) { return Object.prototype.hasOwnProperty.call(known, name); });
    });

    if (!allKnown) {
      lines.push("Substitution fixed the coefficient on each full linear power. Expand the identity to find the remaining letters.");
      var columns = [];
      var names = [];
      for (var c = 0; c < terms.length; c++) {
        var cols = termColumns(terms[c], variable);
        for (var h = 0; h < terms[c].names.length; h++) {
          names.push(terms[c].names[h]);
          columns.push(cols[h]);
        }
      }
      var degree = deg(product);
      var matrix = [];
      var rhs = [];
      var labels = [];
      var target = polyScale(rem, div(ONE, scale));
      for (var power = 0; power < degree; power++) {
        var row = [];
        for (var col = 0; col < columns.length; col++) {
          row.push(power < columns[col].length ? columns[col][power] : ZERO);
        }
        matrix.push(row);
        rhs.push(power < target.length ? target[power] : ZERO);
        labels.push(powerLabel(power, variable));
      }
      if (matrix.length !== names.length) {
        throw new Error("The coefficient system is not square. Factoring did not account for every degree.");
      }

      lines.push("Multiply through by the factored denominator. Each letter multiplies the factors that its own denominator does not already include.");
      for (var e = 0; e < terms.length; e++) {
        lines.push(contributionSentence(terms[e], variable));
      }
      lines.push("The sum of those pieces equals " + fmtPoly(target, variable) + ".");
      lines.push("");
      var knownNames = [];
      for (var kn = 0; kn < names.length; kn++) {
        if (Object.prototype.hasOwnProperty.call(known, names[kn])) knownNames.push(names[kn] + " = " + fmt(known[names[kn]]));
      }
      if (knownNames.length) {
        lines.push("Match coefficients, then substitute the cover-up values.");
        for (var eqi = 0; eqi < matrix.length; eqi++) {
          lines.push(labels[eqi] + ": " + fmtLinComb(matrix[eqi], names) + " = " + fmt(rhs[eqi]));
        }
        lines.push("");
      }

      var unknownNames = [];
      var unknownRows = [];
      var unknownRhs = [];
      var unknownLabels = [];
      for (var mi = 0; mi < matrix.length; mi++) {
        var newRhs = rhs[mi];
        var newRow = [];
        var newNames = [];
        for (var nj = 0; nj < names.length; nj++) {
          if (Object.prototype.hasOwnProperty.call(known, names[nj])) {
            newRhs = sub(newRhs, mul(matrix[mi][nj], known[names[nj]]));
          } else {
            newRow.push(matrix[mi][nj]);
            newNames.push(names[nj]);
          }
        }
        var alive = newRow.some(function (coef) { return !isZero(coef); });
        if (!alive) {
          if (!isZero(newRhs)) throw new Error("A coefficient equation disagreed with the cover-up values.");
          continue;
        }
        unknownRows.push(newRow);
        unknownRhs.push(newRhs);
        unknownNames = newNames;
        unknownLabels.push(labels[mi]);
      }
      if (unknownNames.length !== (unknownRows[0] ? unknownRows[0].length : 0)) {
        throw new Error("The reduced coefficient system lost a column.");
      }
      if (!unknownNames.length) {
        lines.push("Every coefficient was fixed by substitution, and those values satisfy the expanded identity.");
      } else {
        if (knownNames.length) lines.push("Substitute " + englishList(knownNames) + ".");
        var solved = rrefSolve(unknownRows, unknownRhs, unknownNames, unknownLabels, "The equations that still have an unknown letter:");
        lines = lines.concat(solved.lines);
        lines.push("");
        for (var si = 0; si < unknownNames.length; si++) {
          values[unknownNames[si]] = solved.solution[si];
          lines.push(unknownNames[si] + " = " + fmt(solved.solution[si]) + ".");
        }
        lines.push("");
      }
    }

    for (var checkName = 0; checkName < terms.length; checkName++) {
      for (var cn = 0; cn < terms[checkName].names.length; cn++) {
        if (!Object.prototype.hasOwnProperty.call(values, terms[checkName].names[cn])) {
          throw new Error("An unknown coefficient was never solved.");
        }
      }
    }

    var summary = fmtSummary(quotient, terms, values, variable);
    lines.push("Decomposition");
    lines.push(fmtSide(originalNum, originalDen, variable) + " = " + summary + ".");
    if (deg(quotient) >= 0) {
      lines.push("The polynomial " + fmtPoly(quotient, variable) + " is the quotient from the division. The fractions come from the remainder.");
    }
    var omitted = [];
    terms.forEach(function (term) {
      term.names.forEach(function (name) {
        if (isZero(values[name])) omitted.push(name);
      });
    });
    if (omitted.length) {
      lines.push(englishList(omitted) + (omitted.length === 1 ? " is" : " are") + " 0, so " + (omitted.length === 1 ? "that term is" : "those terms are") + " left out of the sum.");
    }
    lines.push("");
    var combined = [];
    for (var bi = 0; bi < terms.length; bi++) {
      var numerPoly = solvedNumerator(terms[bi], values);
      var contrib = polyMul(numerPoly, terms[bi].cofactor);
      combined = polyAdd(combined, contrib);
    }
    var targetRem = polyScale(rem, div(ONE, scale));
    if (!polyEq(trimPoly(combined), trimPoly(targetRem))) {
      throw new Error("The partial fractions do not recombine to the numerator.");
    }
    lines.push("Check. Multiply each partial fraction by the factors it does not already include, then add.");
    var checkParts = [];
    for (var ck = 0; ck < terms.length; ck++) {
      var numerCk = solvedNumerator(terms[ck], values);
      if (deg(numerCk) < 0) continue;
      var signedCk = splitSign(numerCk);
      var piece = fmtPoly(signedCk.poly, variable);
      if (needsNumeratorParens(signedCk.poly)) piece = "(" + piece + ")";
      var cofCk = terms[ck].cofactor;
      if (!(deg(cofCk) === 0 && eq(cofCk[0], ONE))) piece += "·(" + fmtPoly(cofCk, variable) + ")";
      checkParts.push({ neg: signedCk.neg, text: piece });
    }
    lines.push(joinSigned(checkParts) + " = " + fmtPoly(combined, variable) + ".");
    if (eq(scale, ONE)) {
      lines.push("That is the numerator of the proper fraction, so the decomposition is correct wherever the denominator is not zero.");
    } else {
      lines.push("Multiply that sum by the constant " + fmt(scale) + " and you recover the numerator of the proper fraction. The identity holds wherever the denominator is not zero.");
    }
    return { summary: summary, lines: lines, variable: variable };
  }

  function factorMult(factors, factorPoly) {
    for (var i = 0; i < factors.length; i++) {
      if (polyEq(bigPolyToRat(factors[i].poly), factorPoly)) return factors[i].mult;
    }
    return 1;
  }

  function boot() {
    var form = document.getElementById("pf-form");
    if (!form) return;
    var numEl = document.getElementById("pf-num");
    var denEl = document.getElementById("pf-den");
    var errorEl = document.getElementById("pf-error");
    var resultEl = document.getElementById("pf-result");
    var amountEl = document.getElementById("pf-amount");
    var detailEl = document.getElementById("pf-detail");
    var clearBtn = document.getElementById("pf-clear");

    function clearError() {
      errorEl.textContent = "";
      errorEl.classList.remove("visible");
    }
    function showError(msg) {
      resultEl.classList.remove("visible");
      amountEl.textContent = "";
      detailEl.textContent = "";
      errorEl.textContent = msg;
      errorEl.classList.add("visible");
    }
    function run() {
      clearError();
      try {
        var solved = decompose(numEl.value, denEl.value);
        amountEl.textContent = solved.summary;
        detailEl.textContent = solved.lines.join("\n") + "\n\nEducational use only.";
        resultEl.classList.add("visible");
      } catch (err) {
        showError(err.message || "Could not complete the decomposition.");
      }
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      run();
    });
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        numEl.value = "";
        denEl.value = "";
        clearError();
        resultEl.classList.remove("visible");
        amountEl.textContent = "";
        detailEl.textContent = "";
        numEl.focus();
      });
    }
    if (String(numEl.value).trim() && String(denEl.value).trim()) run();
  }

  return {
    decompose: decompose,
    parsePolynomial: parsePolynomial,
    fmtPoly: fmtPoly,
    boot: boot,
    MINUS: MINUS
  };
});
