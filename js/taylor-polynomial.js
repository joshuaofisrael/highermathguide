/* Taylor and Maclaurin polynomials for standard functions.
   Exact rational arithmetic, square roots, and symbolic factors. No libraries. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.TaylorPolynomial = api;
  if (typeof document !== "undefined") api.boot();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MINUS = "\u2212";
  var SQRT = "\u221A";
  var PI = "\u03C0";
  var MID = "\u00B7";
  var LEQ = "\u2264";
  var GEQ = "\u2265";
  var PLUSMINUS = "\u00B1";

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
  function absRat(a) { return a.n < 0n ? neg(a) : a; }
  function isZero(a) { return a.n === 0n; }
  function eq(a, b) { return a.n === b.n && a.d === b.d; }
  function cmpRat(a, b) {
    var left = a.n * b.d;
    var right = b.n * a.d;
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  }

  var ZERO = rat(0n, 1n);
  var ONE = rat(1n, 1n);
  var NEG_ONE = rat(-1n, 1n);

  function fmtRat(a) {
    var sign = a.n < 0n ? MINUS : "";
    var n = a.n < 0n ? -a.n : a.n;
    if (a.d === 1n) return sign + n.toString();
    return sign + n.toString() + "/" + a.d.toString();
  }

  function intPowBig(base, exp) {
    var result = 1n;
    var b = base < 0n ? -base : base;
    var e = exp;
    if (e < 0n) throw new Error("Internal power was negative.");
    while (e > 0n) {
      if (e & 1n) result *= b;
      e >>= 1n;
      if (e) b *= b;
    }
    if (base < 0n && (exp & 1n) === 1n) result = -result;
    return result;
  }

  function intPowRat(base, exp) {
    if (exp === 0n) return ONE;
    if (exp < 0n) {
      if (base.n === 0n) throw new Error("Division by zero.");
      return div(ONE, intPowRat(base, -exp));
    }
    return rat(intPowBig(base.n, exp), intPowBig(base.d, exp));
  }

  function isqrt(n) {
    if (n < 0n) throw new Error("Internal square root was negative.");
    if (n < 2n) return n;
    var x = n;
    var y = (x + 1n) / 2n;
    var guard = 0;
    while (y < x) {
      if (++guard > 20000) break;
      x = y;
      y = (x + n / x) / 2n;
    }
    if (x * x > n) x -= 1n;
    return x;
  }

  function stripSquares(n) {
    if (n < 0n) throw new Error("Internal square root was negative.");
    if (n === 0n) return { coef: 0n, rad: 0n };
    var coef = 1n;
    var rad = 1n;
    var x = n;
    var p = 2n;
    while (x > 1n && p <= 1000003n && p * p <= x) {
      if (x % p === 0n) {
        var count = 0;
        while (x % p === 0n) {
          x /= p;
          count += 1;
        }
        var pairs = count / 2;
        var i;
        for (i = 0; i < pairs; i++) coef *= p;
        if (count % 2 === 1) rad *= p;
      }
      p = p === 2n ? 3n : p + 2n;
    }
    if (x > 1n) {
      var s = isqrt(x);
      if (s * s === x) coef *= s;
      else rad *= x;
    }
    return { coef: coef, rad: rad };
  }

  function integerRoot(n, den) {
    if (n < 0n) return null;
    if (den === 1n) return n;
    if (n <= 1n) return n;
    var lo = 1n;
    var hi = n;
    while (lo < hi) {
      var mid = (lo + hi + 1n) >> 1n;
      var p = intPowBig(mid, den);
      if (p <= n) lo = mid;
      else hi = mid - 1n;
    }
    return intPowBig(lo, den) === n ? lo : null;
  }

  function factorial(k) {
    var f = 1n;
    var i;
    for (i = 2; i <= k; i++) f *= BigInt(i);
    return f;
  }

  function factNum(k) {
    var f = 1;
    var i;
    for (i = 2; i <= k; i++) f *= i;
    return f;
  }

  function ratToNumber(q) {
    if (q.n === 0n) return 0;
    var sign = q.n < 0n ? -1 : 1;
    var n = q.n < 0n ? -q.n : q.n;
    var d = q.d;
    if (n <= 9007199254740991n && d <= 9007199254740991n) {
      return sign * (Number(n) / Number(d));
    }
    function bigLog(v) {
      var s = v.toString();
      if (s.length <= 15) return Math.log(Number(s));
      return Math.log(Number(s.slice(0, 15))) + (s.length - 15) * Math.LN10;
    }
    var ln = bigLog(n) - bigLog(d);
    if (ln > 709) return sign * Infinity;
    if (ln < -745) return 0;
    return sign * Math.exp(ln);
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
    if (digits.length > 18) {
      throw new Error("Use 18 digits or fewer in each number.");
    }
    return rat(sign * BigInt(digits), 10n ** BigInt(places));
  }

  function parseRational(raw) {
    var s = String(raw).trim().replace(/[\u2212\u2013\u2014]/g, "-").replace(/\s+/g, "");
    if (!s) throw new Error("Enter a number.");
    var frac = s.match(/^([+-]?)(\d+)\/(\d+)$/);
    if (frac) {
      if (frac[2].length > 18 || frac[3].length > 18) {
        throw new Error("Use 18 digits or fewer in each number.");
      }
      if (frac[3] === "0") throw new Error("Division by zero.");
      var sign = frac[1] === "-" ? -1n : 1n;
      return rat(sign * BigInt(frac[2]), BigInt(frac[3]));
    }
    var num = parseNumberToken(s);
    if (!num) throw new Error("Could not read the number " + raw.trim() + ". Use an integer, a decimal, or a fraction such as 3/4.");
    return num;
  }

  function parseCenter(raw) {
    var s = String(raw == null ? "" : raw).trim().replace(/[\u2212\u2013\u2014]/g, "-").replace(/\s+/g, "");
    if (!s) throw new Error("Enter a center a.");
    var piForm = s.replace(/\u03C0/g, "pi");
    if (/pi/i.test(piForm)) {
      var m = piForm.match(/^([+-])?(?:(\d+\/\d+|\d+(?:\.\d+)?)\*?)?pi(?:\/(\d+))?$/i);
      if (!m) {
        throw new Error("Could not read the center. Use a number, a fraction, or a multiple of pi such as pi/2, -pi/6, or 2pi/3.");
      }
      var coef;
      if (!m[2]) coef = ONE;
      else coef = parseRational(m[2]);
      if (m[1] === "-") coef = neg(coef);
      if (m[3]) {
        var den = BigInt(m[3]);
        if (den === 0n) throw new Error("Division by zero in the center.");
        coef = div(coef, rat(den, 1n));
      }
      if (isZero(coef)) return { kind: "rat", q: ZERO };
      return { kind: "pi", q: coef };
    }
    return { kind: "rat", q: parseRational(s) };
  }

  function centerNumber(center) {
    if (center.kind === "pi") return ratToNumber(center.q) * Math.PI;
    return ratToNumber(center.q);
  }

  function fmtPiMultiple(q) {
    var neg = q.n < 0n;
    var a = absRat(q);
    var body;
    if (eq(a, ONE)) body = PI;
    else if (a.d === 1n) body = a.n.toString() + PI;
    else if (a.n === 1n) body = PI + "/" + a.d.toString();
    else body = a.n.toString() + PI + "/" + a.d.toString();
    return (neg ? MINUS : "") + body;
  }

  function fmtCenter(center) {
    if (center.kind === "pi") return fmtPiMultiple(center.q);
    return fmtRat(center.q);
  }

  function fmtExpArg(kind, q) {
    if (kind === "pi") {
      if (eq(q, ONE)) return "e^{" + PI + "}";
      return "e^{" + fmtPiMultiple(q) + "}";
    }
    if (eq(q, ONE)) return "e";
    if (eq(q, NEG_ONE)) return "e^{" + MINUS + "1}";
    var text = fmtRat(q);
    if (q.d === 1n && q.n > 0n) return "e^" + text;
    return "e^{" + text + "}";
  }

  function wrapSym(symbol) {
    if (!symbol) return symbol;
    if (symbol.charAt(0) === "(") return symbol;
    if (symbol.indexOf("/") !== -1 || symbol.indexOf(" ") !== -1 || symbol.indexOf("+") !== -1) {
      return "(" + symbol + ")";
    }
    return symbol;
  }

  function fmtTimes(q, symbol) {
    if (!symbol) return fmtRat(q);
    if (q.n === 0n) return "0";
    var sym = wrapSym(symbol);
    var neg = q.n < 0n;
    var absq = absRat(q);
    var sign = neg ? MINUS : "";
    if (eq(absq, ONE)) return sign + sym;
    if (absq.n === 1n && sym.indexOf("/") === -1 && sym.charAt(0) !== "(") {
      return sign + sym + "/" + absq.d.toString();
    }
    if (absq.d === 1n) return sign + absq.n.toString() + " " + sym;
    return sign + "(" + fmtRat(absq) + ") " + sym;
  }

  function surdZero() {
    return { a: ZERO, b2: ZERO, b3: ZERO, b6: ZERO };
  }

  function scaleSurd(s, m) {
    return {
      a: mul(s.a, m),
      b2: mul(s.b2, m),
      b3: mul(s.b3, m),
      b6: mul(s.b6, m)
    };
  }

  function isZeroSurd(s) {
    return s.a.n === 0n && s.b2.n === 0n && s.b3.n === 0n && s.b6.n === 0n;
  }

  function isRationalSurd(s) {
    return s.b2.n === 0n && s.b3.n === 0n && s.b6.n === 0n;
  }

  function surdToNumber(s) {
    return ratToNumber(s.a)
      + ratToNumber(s.b2) * Math.SQRT2
      + ratToNumber(s.b3) * Math.sqrt(3)
      + ratToNumber(s.b6) * Math.sqrt(6);
  }

  function fmtSurd(s) {
    if (isZeroSurd(s)) return "0";
    if (isRationalSurd(s)) return fmtRat(s.a);
    var parts = [s.a, s.b2, s.b3, s.b6];
    var labels = ["", SQRT + "2", SQRT + "3", SQRT + "6"];
    var D = 1n;
    var i;
    for (i = 0; i < 4; i++) D = lcm(D, parts[i].d);
    var chunks = [];
    for (i = 0; i < 4; i++) {
      var num = parts[i].n * (D / parts[i].d);
      if (num === 0n) continue;
      var neg = num < 0n;
      var mag = neg ? -num : num;
      var body = labels[i]
        ? (mag === 1n ? labels[i] : mag.toString() + labels[i])
        : mag.toString();
      chunks.push({ neg: neg, body: body });
    }
    if (chunks.length > 1 && chunks[0].neg) {
      var pos = -1;
      for (i = 0; i < chunks.length; i++) if (!chunks[i].neg) { pos = i; break; }
      if (pos > 0) {
        var item = chunks.splice(pos, 1)[0];
        chunks.unshift(item);
      }
    }
    var numText = "";
    for (i = 0; i < chunks.length; i++) {
      if (i === 0) numText = (chunks[i].neg ? MINUS : "") + chunks[i].body;
      else numText += chunks[i].neg ? " " + MINUS + " " + chunks[i].body : " + " + chunks[i].body;
    }
    if (D === 1n) return numText;
    if (chunks.length === 1) return numText + "/" + D.toString();
    return "(" + numText + ")/" + D.toString();
  }

  function sqrtOfRat(base) {
    var parts = stripSquares(base.n * base.d);
    var rad = parts.rad === 0n ? 1n : parts.rad;
    return { q: rat(parts.coef, base.d), rad: rad };
  }

  function powHalf(base, eu) {
    if (eu % 2n === 0n) return { kind: "rat", q: intPowRat(base, eu / 2n) };
    var root = sqrtOfRat(base);
    var negative = eu < 0n;
    var absEu = negative ? -eu : eu;
    var qPow = intPowRat(root.q, absEu);
    var extra = intPowBig(root.rad, (absEu - 1n) / 2n);
    var q = mul(qPow, rat(extra, 1n));
    var rad = root.rad;
    if (negative) {
      if (q.n === 0n || rad === 0n) return { kind: "undef" };
      q = div(ONE, mul(q, rat(rad, 1n)));
    }
    if (rad === 1n) return { kind: "rat", q: q };
    return { kind: "sqrt", q: q, rad: rad };
  }

  function powRat(base, exp) {
    if (isZero(base)) {
      if (exp.n > 0n) return { kind: "rat", q: ZERO };
      return { kind: "undef" };
    }
    if (isZero(exp)) return { kind: "rat", q: ONE };
    if (exp.d === 1n) return { kind: "rat", q: intPowRat(base, exp.n) };
    if (base.n < 0n) return { kind: "undef" };
    if (exp.d === 2n) return powHalf(base, exp.n);
    var rn = integerRoot(base.n, exp.d);
    var rd = integerRoot(base.d, exp.d);
    if (rn !== null && rd !== null) {
      return { kind: "rat", q: intPowRat(rat(rn, rd), exp.n) };
    }
    return { kind: "symbolic", base: base, exp: exp };
  }

  function fmtSqrtValue(q, rad) {
    if (rad === 1n) return fmtRat(q);
    if (rad === 2n) return fmtSurd({ a: ZERO, b2: q, b3: ZERO, b6: ZERO });
    if (rad === 3n) return fmtSurd({ a: ZERO, b2: ZERO, b3: q, b6: ZERO });
    if (rad === 6n) return fmtSurd({ a: ZERO, b2: ZERO, b3: ZERO, b6: q });
    var root = SQRT + rad.toString();
    return fmtTimes(q, root);
  }

  function sqrtToNumber(q, rad) {
    if (rad > 9007199254740991n) return ratToNumber(q) * Math.sqrt(ratToNumber(rat(rad, 1n)));
    return ratToNumber(q) * Math.sqrt(Number(rad));
  }

  function fmtPower(base, exp) {
    var b = fmtRat(base);
    if (base.d !== 1n || base.n < 0n) b = "(" + b + ")";
    var e = fmtRat(exp);
    if (exp.d !== 1n || exp.n < 0n) e = "{" + e + "}";
    else e = e;
    return b + "^" + (exp.d !== 1n || exp.n < 0n ? "{" + fmtRat(exp) + "}" : fmtRat(exp));
  }

  function valueFromPower(pow) {
    if (pow.kind === "rat") return { text: fmtRat(pow.q), numeric: ratToNumber(pow.q), rat: pow.q, surd: null };
    if (pow.kind === "sqrt") {
      return {
        text: fmtSqrtValue(pow.q, pow.rad),
        numeric: sqrtToNumber(pow.q, pow.rad),
        rat: null,
        surd: null
      };
    }
    if (pow.kind === "symbolic") {
      return {
        text: fmtPower(pow.base, pow.exp),
        numeric: Math.pow(ratToNumber(pow.base), ratToNumber(pow.exp)),
        rat: null,
        surd: null
      };
    }
    return null;
  }

  function scaleValue(val, m) {
    if (!val) return null;
    if (val.rat) {
      var q = mul(val.rat, m);
      return { text: fmtRat(q), numeric: ratToNumber(q), rat: q };
    }
    return {
      text: fmtTimes(m, val.text),
      numeric: ratToNumber(m) * val.numeric,
      rat: null
    };
  }

  function acuteSinCos(k) {
    var z = ZERO;
    var h = rat(1n, 2n);
    var q = rat(1n, 4n);
    if (k === 0) return { s: { a: z, b2: z, b3: z, b6: z }, c: { a: ONE, b2: z, b3: z, b6: z } };
    if (k === 1) return { s: { a: z, b2: neg(q), b3: z, b6: q }, c: { a: z, b2: q, b3: z, b6: q } };
    if (k === 2) return { s: { a: h, b2: z, b3: z, b6: z }, c: { a: z, b2: z, b3: h, b6: z } };
    if (k === 3) return { s: { a: z, b2: h, b3: z, b6: z }, c: { a: z, b2: h, b3: z, b6: z } };
    if (k === 4) return { s: { a: z, b2: z, b3: h, b6: z }, c: { a: h, b2: z, b3: z, b6: z } };
    if (k === 5) return { s: { a: z, b2: q, b3: z, b6: q }, c: { a: z, b2: neg(q), b3: z, b6: q } };
    return { s: { a: ONE, b2: z, b3: z, b6: z }, c: { a: z, b2: z, b3: z, b6: z } };
  }

  function sinCosTwelfth(k) {
    k = ((k % 24) + 24) % 24;
    var base;
    var sinSign = 1;
    var cosSign = 1;
    if (k <= 6) base = k;
    else if (k <= 12) { base = 12 - k; cosSign = -1; }
    else if (k <= 18) { base = k - 12; sinSign = -1; cosSign = -1; }
    else { base = 24 - k; sinSign = -1; }
    var pair = acuteSinCos(base);
    var ss = sinSign < 0 ? NEG_ONE : ONE;
    var cs = cosSign < 0 ? NEG_ONE : ONE;
    return { sin: scaleSurd(pair.s, ss), cos: scaleSurd(pair.c, cs) };
  }

  function sinCosOfPiMultiple(r) {
    var two = rat(2n, 1n);
    var turns = div(r, two);
    var fl = turns.n / turns.d;
    if (turns.n < 0n && turns.n % turns.d !== 0n) fl -= 1n;
    var reduced = sub(r, mul(two, rat(fl, 1n)));
    var twelfths = mul(reduced, rat(12n, 1n));
    if (twelfths.d !== 1n) return null;
    if (twelfths.n < 0n || twelfths.n > 24n) return null;
    return sinCosTwelfth(Number(twelfths.n));
  }

  function modAngle(center, c) {
    if (center.kind === "pi") return sinCosOfPiMultiple(mul(c, center.q));
    if (isZero(mul(c, center.q))) {
      return {
        sin: surdZero(),
        cos: { a: ONE, b2: ZERO, b3: ZERO, b6: ZERO }
      };
    }
    return null;
  }

  function fmtAngle(c, center) {
    if (center.kind === "pi") return fmtPiMultiple(mul(c, center.q));
    return fmtRat(mul(c, center.q));
  }

  function sinDerivKind(k) {
    var m = k % 4;
    if (m === 0) return { fn: "sin", sign: 1 };
    if (m === 1) return { fn: "cos", sign: 1 };
    if (m === 2) return { fn: "sin", sign: -1 };
    return { fn: "cos", sign: -1 };
  }

  function cosDerivKind(k) {
    var m = k % 4;
    if (m === 0) return { fn: "cos", sign: 1 };
    if (m === 1) return { fn: "sin", sign: -1 };
    if (m === 2) return { fn: "cos", sign: -1 };
    return { fn: "sin", sign: 1 };
  }

  function falling(p, k) {
    var acc = ONE;
    var i;
    for (i = 0; i < k; i++) acc = mul(acc, sub(p, rat(BigInt(i), 1n)));
    return acc;
  }

  function fmtLin(coef) {
    if (eq(coef, ONE)) return "x";
    if (eq(coef, NEG_ONE)) return MINUS + "x";
    if (coef.d === 1n) return fmtRat(coef) + "x";
    return "(" + fmtRat(coef) + ")x";
  }

  function functionLabel(spec) {
    var c = spec.c;
    if (spec.family === "exp") {
      if (eq(c, ONE)) return "e^x";
      return "e^(" + fmtLin(c) + ")";
    }
    if (spec.family === "sin") {
      if (eq(c, ONE)) return "sin x";
      return "sin(" + fmtLin(c) + ")";
    }
    if (spec.family === "cos") {
      if (eq(c, ONE)) return "cos x";
      return "cos(" + fmtLin(c) + ")";
    }
    if (spec.family === "ln1p") return "ln(1 + x)";
    if (spec.family === "ln") return "ln x";
    if (spec.family === "geom") return "1/(1 " + MINUS + " x)";
    if (spec.family === "atan") return "arctan x";
    if (spec.family === "sqrt") return "sqrt(1 + x)";
    if (eq(spec.p, rat(1n, 2n))) return "sqrt(1 + x)";
    if (spec.p.d === 1n && spec.p.n >= 0n) return "(1 + x)^" + spec.p.n.toString();
    return "(1 + x)^{" + fmtRat(spec.p) + "}";
  }

  function factCell(k) {
    return k + "! = " + factorial(k).toString();
  }

  function coefForms(unreducedText, shortText, k) {
    if (k < 2) return shortText;
    if (unreducedText === shortText) return shortText;
    return unreducedText + " = " + shortText;
  }

  function attach(coef, pow) {
    var neg = false;
    var body = coef;
    if (body.charAt(0) === MINUS) {
      neg = true;
      body = body.slice(1);
    }
    if (body === "1") return (neg ? MINUS : "") + pow;
    if (body.indexOf("/") !== -1 && body.charAt(0) !== "(") body = "(" + body + ")";
    else if (/\s/.test(body) && body.charAt(0) !== "(") body = "(" + body + ")";
    return (neg ? MINUS : "") + body + " " + pow;
  }

  function powerText(center, k) {
    if (k === 0) return "";
    var base;
    if (center.kind === "rat" && isZero(center.q)) base = "x";
    else if (center.kind === "rat" && center.q.n < 0n) base = "(x + " + fmtRat(absRat(center.q)) + ")";
    else if (center.kind === "pi" && center.q.n < 0n) base = "(x + " + fmtPiMultiple(absRat(center.q)) + ")";
    else base = "(x " + MINUS + " " + fmtCenter(center) + ")";
    if (k === 1) return base;
    return base + "^" + k;
  }

  function joinTerms(terms) {
    var out = "";
    var i;
    for (i = 0; i < terms.length; i++) {
      var t = terms[i];
      if (!t || t === "0") continue;
      if (!out) out = t;
      else if (t.charAt(0) === MINUS) out += " " + MINUS + " " + t.slice(1);
      else out += " + " + t;
    }
    return out || "0";
  }

  function unreducedOverFact(derivText, k) {
    if (k === 0 || derivText === "0") return derivText;
    var body = derivText;
    var neg = false;
    if (body.charAt(0) === MINUS) {
      neg = true;
      body = body.slice(1);
    }
    var complex = body.indexOf("/") !== -1 || body.indexOf(" ") !== -1 || body.indexOf("+") !== -1 || body.charAt(0) === "(";
    var core = complex ? "(" + body + ")" : body;
    return (neg ? MINUS : "") + core + "/" + k + "!";
  }

  function finishRow(k, center, derivText, coefShort, coefNumeric, coefRat) {
    var pow = powerText(center, k);
    var term = coefShort === "0" ? "0" : (k === 0 ? coefShort : attach(coefShort, pow));
    return {
      k: k,
      derivText: derivText,
      factText: factCell(k),
      coefText: coefForms(unreducedOverFact(derivText, k), coefShort, k),
      coefShort: coefShort,
      termText: term,
      coefNumeric: coefNumeric,
      coefRat: coefRat || null
    };
  }

  function rowFromValue(k, center, derivVal) {
    var fact = rat(factorial(k), 1n);
    var coefVal = scaleValue(derivVal, div(ONE, fact));
    return finishRow(k, center, derivVal.text, coefVal.text, coefVal.numeric, coefVal.rat || null);
  }

  function rowFromSurd(k, center, surd) {
    var coefSurd = scaleSurd(surd, div(ONE, rat(factorial(k), 1n)));
    if (isRationalSurd(coefSurd) && isRationalSurd(surd)) {
      return rowFromValue(k, center, rationalValue(surd.a));
    }
    return finishRow(k, center, fmtSurd(surd), fmtSurd(coefSurd), surdToNumber(coefSurd), isRationalSurd(coefSurd) ? coefSurd.a : null);
  }

  function rowFromSqrt(k, center, q, rad) {
    var coefQ = div(q, rat(factorial(k), 1n));
    return finishRow(
      k,
      center,
      fmtSqrtValue(q, rad),
      fmtSqrtValue(coefQ, rad),
      sqrtToNumber(coefQ, rad),
      rad === 1n ? coefQ : null
    );
  }

  function rationalValue(q) {
    return { text: fmtRat(q), numeric: ratToNumber(q), rat: q };
  }

  function buildExpRow(spec, k) {
    var ck = intPowRat(spec.c, BigInt(k));
    var argKind = spec.center.kind;
    var arg = mul(spec.c, spec.center.q);
    if (isZero(arg) || (argKind === "rat" && isZero(arg))) {
      return rowFromValue(k, spec.center, rationalValue(ck));
    }
    var symbol = fmtExpArg(argKind, arg);
    var numeric = ratToNumber(ck) * Math.exp(spec.cNum * spec.aNum);
    return rowFromValue(k, spec.center, { text: fmtTimes(ck, symbol), numeric: numeric, rat: null });
  }

  function buildTrigRow(spec, k) {
    var kind = spec.family === "sin" ? sinDerivKind(k) : cosDerivKind(k);
    var ck = intPowRat(spec.c, BigInt(k));
    var signed = kind.sign < 0 ? neg(ck) : ck;
    var exact = modAngle(spec.center, spec.c);
    if (exact) {
      var surd = scaleSurd(kind.fn === "sin" ? exact.sin : exact.cos, signed);
      return rowFromSurd(k, spec.center, surd);
    }
    var angle = fmtAngle(spec.c, spec.center);
    var symbol = kind.fn + "(" + angle + ")";
    var trig = kind.fn === "sin"
      ? Math.sin(spec.cNum * spec.aNum)
      : Math.cos(spec.cNum * spec.aNum);
    var numeric = ratToNumber(signed) * trig;
    return rowFromValue(k, spec.center, { text: fmtTimes(signed, symbol), numeric: numeric, rat: null });
  }

  function lnDerivRational(k, base) {
    if (k === 0) return null;
    var sign = (k % 2 === 1) ? ONE : NEG_ONE;
    var mag = rat(factorial(k - 1), 1n);
    var den = intPowRat(base, BigInt(k));
    return div(mul(sign, mag), den);
  }

  function buildLnRow(spec, k) {
    var base = spec.family === "ln" ? spec.center.q : add(ONE, spec.center.q);
    var baseNum = spec.family === "ln" ? spec.aNum : 1 + spec.aNum;
    if (k === 0) {
      if (spec.center.kind === "rat" && eq(base, ONE)) return rowFromValue(k, spec.center, rationalValue(ZERO));
      var argText = spec.center.kind === "rat" ? fmtRat(base) : (spec.family === "ln" ? fmtCenter(spec.center) : "1 + " + fmtCenter(spec.center));
      if (spec.center.kind !== "rat" && spec.family === "ln1p") argText = "1 + " + fmtCenter(spec.center);
      return rowFromValue(k, spec.center, {
        text: "ln(" + argText + ")",
        numeric: Math.log(baseNum),
        rat: null
      });
    }
    if (spec.center.kind === "rat") {
      return rowFromValue(k, spec.center, rationalValue(lnDerivRational(k, base)));
    }
    var sign = (k % 2 === 1) ? "" : MINUS;
    var text = sign + (k - 1) + "!/(" + (spec.family === "ln" ? fmtCenter(spec.center) : "1 + " + fmtCenter(spec.center)) + ")^" + k;
    if (k === 1) text = sign + "1/(" + (spec.family === "ln" ? fmtCenter(spec.center) : "1 + " + fmtCenter(spec.center)) + ")";
    var numeric = (k % 2 === 1 ? 1 : -1) * factNum(k - 1) / Math.pow(baseNum, k);
    return rowFromValue(k, spec.center, { text: text, numeric: numeric, rat: null });
  }

  function buildGeomRow(spec, k) {
    var gap = spec.center.kind === "rat" ? sub(ONE, spec.center.q) : null;
    if (gap && !isZero(gap)) {
      var coefDeriv = div(rat(factorial(k), 1n), intPowRat(gap, BigInt(k + 1)));
      return rowFromValue(k, spec.center, rationalValue(coefDeriv));
    }
    var g = 1 - spec.aNum;
    var numeric = factNum(k) / Math.pow(g, k + 1);
    var text = k + "!/(1 " + MINUS + " " + fmtCenter(spec.center) + ")^" + (k + 1);
    if (k === 0) text = "1/(1 " + MINUS + " " + fmtCenter(spec.center) + ")";
    return rowFromValue(k, spec.center, { text: text, numeric: numeric, rat: null });
  }

  function arctanDerivatives(a, n) {
    var ys = [null];
    var den = add(ONE, mul(a, a));
    ys[1] = div(ONE, den);
    var k;
    for (k = 2; k <= n; k++) {
      var km1 = rat(BigInt(k - 1), 1n);
      var km2 = rat(BigInt(k - 2), 1n);
      var term1 = mul(mul(rat(2n, 1n), a), mul(km1, ys[k - 1]));
      var term2 = mul(mul(km1, km2), ys[k - 2] || ZERO);
      ys[k] = div(neg(add(term1, term2)), den);
    }
    return ys;
  }

  function arctanDerivativesNumeric(a, n) {
    var den = 1 + a * a;
    var ys = [Math.atan(a), 1 / den];
    var k;
    for (k = 2; k <= n; k++) {
      ys[k] = -(2 * a * (k - 1) * ys[k - 1] + (k - 1) * (k - 2) * ys[k - 2]) / den;
    }
    return ys;
  }

  function buildAtanRow(spec, k, derivs) {
    if (k === 0) {
      if (spec.center.kind === "rat" && isZero(spec.center.q)) return rowFromValue(k, spec.center, rationalValue(ZERO));
      if (spec.center.kind === "rat" && eq(spec.center.q, ONE)) {
        return rowFromValue(k, spec.center, { text: PI + "/4", numeric: Math.PI / 4, rat: null });
      }
      if (spec.center.kind === "rat" && eq(spec.center.q, NEG_ONE)) {
        return rowFromValue(k, spec.center, { text: MINUS + PI + "/4", numeric: -Math.PI / 4, rat: null });
      }
      return rowFromValue(k, spec.center, {
        text: "arctan(" + fmtCenter(spec.center) + ")",
        numeric: Math.atan(spec.aNum),
        rat: null
      });
    }
    if (spec.center.kind === "rat") return rowFromValue(k, spec.center, rationalValue(derivs[k]));
    var num = spec.atanNumeric[k];
    var shown = fmtNumPlain(num) + " (decimal)";
    return finishRow(k, spec.center, shown, k === 0 ? shown : fmtNumPlain(num / factNum(k)) + " (decimal)", num / factNum(k), null);
  }

  function buildPowerRow(spec, k) {
    var p = spec.p;
    var base = spec.center.kind === "rat" ? add(ONE, spec.center.q) : null;
    var fall = k === 0 ? ONE : falling(p, k);
    if (isZero(fall)) return rowFromValue(k, spec.center, rationalValue(ZERO));
    var exp = sub(p, rat(BigInt(k), 1n));
    if (base) {
      var pow = powRat(base, exp);
      if (pow.kind === "undef") {
        throw new Error("The derivative is not real at this center. For a non-integer power, choose a center greater than " + MINUS + "1.");
      }
      if (pow.kind === "rat") return rowFromValue(k, spec.center, rationalValue(mul(fall, pow.q)));
      if (pow.kind === "sqrt") return rowFromSqrt(k, spec.center, mul(fall, pow.q), pow.rad);
      var scaled = scaleValue(valueFromPower(pow), fall);
      return rowFromValue(k, spec.center, scaled);
    }
    var numeric = ratToNumber(fall) * Math.pow(1 + spec.aNum, ratToNumber(exp));
    var text = fmtTimes(fall, "(1 + " + fmtCenter(spec.center) + ")^(" + fmtRat(exp) + ")");
    if (k === 0) text = "(1 + " + fmtCenter(spec.center) + ")^(" + fmtRat(p) + ")";
    return rowFromValue(k, spec.center, { text: text, numeric: numeric, rat: null });
  }

  function buildRows(spec) {
    var derivs = null;
    if (spec.family === "atan" && spec.center.kind === "rat") {
      derivs = arctanDerivatives(spec.center.q, spec.order);
    } else if (spec.family === "atan") {
      spec.atanNumeric = arctanDerivativesNumeric(spec.aNum, spec.order);
    }
    var rows = [];
    var k;
    for (k = 0; k <= spec.order; k++) {
      if (spec.family === "exp") rows.push(buildExpRow(spec, k));
      else if (spec.family === "sin" || spec.family === "cos") rows.push(buildTrigRow(spec, k));
      else if (spec.family === "ln" || spec.family === "ln1p") rows.push(buildLnRow(spec, k));
      else if (spec.family === "geom") rows.push(buildGeomRow(spec, k));
      else if (spec.family === "atan") rows.push(buildAtanRow(spec, k, derivs));
      else rows.push(buildPowerRow(spec, k));
    }
    return rows;
  }

  function nonnegativeInteger(p) {
    return p && p.d === 1n && p.n >= 0n;
  }

  function radiusInfo(spec) {
    var a = spec.aNum;
    var label = functionLabel(spec);
    if (spec.family === "exp" || spec.family === "sin" || spec.family === "cos") {
      return {
        R: Infinity,
        text: "The Taylor series of " + label + " about this center converges for every real x. The radius of convergence is infinite. The polynomial above is the degree-" + spec.order + " truncation, not the whole series."
      };
    }
    if (spec.family === "binom" && nonnegativeInteger(spec.p)) {
      return {
        R: Infinity,
        text: label + " is a polynomial of degree " + spec.p.n.toString() + ". Its Taylor series about any center is finite, so the radius is infinite. For every order n at least " + spec.p.n.toString() + ", the Taylor polynomial equals the function for every x."
      };
    }
    if (spec.family === "ln1p" || spec.family === "sqrt" || spec.family === "binom") {
      var R = Math.abs(a + 1);
      var right = 2 * a + 1;
      var extra = "";
      if (spec.family === "ln1p") {
        extra = " On the real line the series converges for " + MINUS + "1 < x " + LEQ + " " + fmtNumPlain(right) + ". It diverges at x = " + MINUS + "1, where ln(1 + x) is unbounded, and it converges at the right endpoint.";
      } else if (spec.family === "sqrt" && Math.abs(a) < 1e-12) {
        extra = " For the Maclaurin series, that interval of convergence on the real line is [" + MINUS + "1, 1].";
      } else {
        extra = " Endpoint convergence depends on the power. This page states the open interval only.";
      }
      return {
        R: R,
        text: "The real singularity is at x = " + MINUS + "1. The radius of convergence about a = " + fmtCenter(spec.center) + " is the distance |a + 1| = " + fmtNumPlain(R) + ". The series converges when |x " + MINUS + " a| is strictly less than that radius." + extra
      };
    }
    if (spec.family === "ln") {
      var Rln = Math.abs(a);
      return {
        R: Rln,
        text: "The singularity is at x = 0. The radius about a = " + fmtCenter(spec.center) + " is |a| = " + fmtNumPlain(Rln) + ". The series converges for x between 0 and " + fmtNumPlain(2 * a) + ", including the right endpoint x = " + fmtNumPlain(2 * a) + ", and it diverges at x = 0."
      };
    }
    if (spec.family === "geom") {
      var Rg = Math.abs(1 - a);
      return {
        R: Rg,
        text: "The singularity is at x = 1. The radius about a = " + fmtCenter(spec.center) + " is |1 " + MINUS + " a| = " + fmtNumPlain(Rg) + ". The series converges only on the open interval of that radius. Both endpoints diverge, because the terms do not go to 0. When a = 0 this is the geometric series 1 + x + x^2 + ..., which converges for |x| < 1 and diverges for |x| " + GEQ + " 1."
      };
    }
    var Ra = Math.sqrt(1 + a * a);
    var atanExtra = Math.abs(a) < 1e-12
      ? " When a = 0 the radius is 1. The Maclaurin series converges for every x in [" + MINUS + "1, 1] and diverges when |x| > 1, even though arctan x itself is defined for every real x."
      : " Convergence is guaranteed for |x " + MINUS + " a| < " + SQRT + "(1 + a^2). Outside that interval the series diverges, even though arctan x is defined for every real x.";
    return {
      R: Ra,
      text: "arctan x is smooth on the whole real line, but its Taylor series still has a finite radius. The complex singularities are at i and " + MINUS + "i, so the radius about a is " + SQRT + "(1 + a^2) = " + fmtNumPlain(Ra) + "." + atanExtra
    };
  }

  function fmtNumPlain(v) {
    if (!isFinite(v)) return "not a real number";
    if (Object.is(v, -0) || v === 0) return "0";
    var neg = v < 0;
    var av = Math.abs(v);
    var s;
    if (av >= 1e-4 && av < 1e7) {
      s = av.toFixed(10).replace(/0+$/, "").replace(/\.$/, "");
    } else {
      s = av.toExponential(6).replace(/\.?0+e/, "e").replace(/e\+/, "e");
    }
    return (neg ? MINUS : "") + s;
  }

  function horner(coeffs, a, x) {
    var u = x - a;
    var y = 0;
    var k;
    for (k = coeffs.length - 1; k >= 0; k--) y = y * u + coeffs[k];
    return y;
  }

  function evalExactPoly(rows, a, x) {
    var u = sub(x, a);
    var y = ZERO;
    var k;
    for (k = rows.length - 1; k >= 0; k--) {
      if (!rows[k].coefRat) return null;
      y = add(mul(y, u), rows[k].coefRat);
    }
    return y;
  }

  function inDomain(spec, x) {
    if (spec.family === "ln1p") return x > -1;
    if (spec.family === "ln") return x > 0;
    if (spec.family === "geom") return Math.abs(x - 1) > 1e-12;
    if (spec.family === "sqrt" || (spec.family === "binom" && !nonnegativeInteger(spec.p))) return x > -1;
    return true;
  }

  function evalFNumber(spec, x) {
    if (!inDomain(spec, x)) return NaN;
    if (spec.family === "exp") return Math.exp(spec.cNum * x);
    if (spec.family === "sin") return Math.sin(spec.cNum * x);
    if (spec.family === "cos") return Math.cos(spec.cNum * x);
    if (spec.family === "ln1p") return Math.log(1 + x);
    if (spec.family === "ln") return Math.log(x);
    if (spec.family === "geom") return 1 / (1 - x);
    if (spec.family === "atan") return Math.atan(x);
    return Math.pow(1 + x, spec.pNum);
  }

  function evalFExact(spec, xCenter) {
    if (!xCenter || xCenter.kind !== "rat" || spec.center.kind !== "rat") return null;
    if (spec.family === "geom") {
      var den = sub(ONE, xCenter.q);
      if (isZero(den)) return null;
      return div(ONE, den);
    }
    if (spec.family === "binom" && nonnegativeInteger(spec.p)) {
      return intPowRat(add(ONE, xCenter.q), spec.p.n);
    }
    if (spec.family === "sqrt") {
      var pow = powRat(add(ONE, xCenter.q), rat(1n, 2n));
      if (pow.kind === "rat") return pow.q;
    }
    if (spec.family === "exp" && isZero(spec.c)) return ONE;
    if (spec.family === "sin" && isZero(spec.c)) return ZERO;
    if (spec.family === "cos" && isZero(spec.c)) return ONE;
    if (spec.family === "ln1p" && isZero(xCenter.q)) return ZERO;
    if (spec.family === "ln" && eq(xCenter.q, ONE)) return ZERO;
    if (spec.family === "atan" && isZero(xCenter.q)) return ZERO;
    return null;
  }

  function singularities(spec) {
    if (spec.family === "ln1p" || spec.family === "sqrt") return [-1];
    if (spec.family === "binom" && !nonnegativeInteger(spec.p)) return [-1];
    if (spec.family === "ln") return [0];
    if (spec.family === "geom") return [1];
    return [];
  }

  function chooseWindow(spec, a, x) {
    var span = Math.abs(x - a);
    var half = Math.max(0.8, Math.min(4, span > 0 ? span * 1.6 : 1.5));
    var lo = a - half;
    var hi = a + half;
    var sings = singularities(spec);
    var i;
    for (i = 0; i < sings.length; i++) {
      var s = sings[i];
      var gap = Math.max(0.05, Math.min(0.25, 0.15 * Math.max(Math.abs(s - a), 0.2)));
      if (a > s && lo < s + gap) lo = s + gap;
      if (a < s && hi > s - gap) hi = s - gap;
    }
    if (!(hi > lo + 1e-6)) {
      lo = a - 0.4;
      hi = a + 0.4;
    }
    return { lo: lo, hi: hi };
  }

  function remainder(spec, rows) {
    var n = spec.order;
    var a = spec.aNum;
    var x = spec.xNum;
    var h = x - a;
    var absH = Math.abs(h);
    if (absH === 0) {
      return {
        text: "The check point is the center, so every remainder term contains a factor (x " + MINUS + " a) and the remainder is 0. P_n(a) equals f(a)."
      };
    }
    var lo = Math.min(a, x);
    var hi = Math.max(a, x);
    var fact = factNum(n + 1);

    if ((spec.family === "exp" || spec.family === "sin" || spec.family === "cos") && spec.cNum === 0) {
      return { text: "With c = 0 the function is constant, so every derivative of order 1 or higher is 0. The remainder after order " + n + " is 0." };
    }
    if (spec.family === "binom" && nonnegativeInteger(spec.p) && n >= Number(spec.p.n)) {
      return {
        text: "The derivative of order " + (n + 1) + " of a polynomial of degree " + spec.p.n.toString() + " is 0. The Lagrange remainder is 0, and P_" + n + "(x) equals " + functionLabel(spec) + " for every x."
      };
    }

    function hitsSingularity() {
      var sings = singularities(spec);
      var i;
      for (i = 0; i < sings.length; i++) {
        if (sings[i] >= lo - 1e-12 && sings[i] <= hi + 1e-12) return true;
      }
      return false;
    }

    if ((spec.family === "ln1p" || spec.family === "ln" || spec.family === "geom" || spec.family === "sqrt" || (spec.family === "binom" && !nonnegativeInteger(spec.p))) && hitsSingularity()) {
      return {
        text: "The Lagrange form needs a number M such that |f^(" + (n + 1) + ")(t)| " + MID + " M for every t between a and x. On this interval the derivative is unbounded, because the interval meets a singularity. This page will not print a finite bound."
      };
    }

    var formula = "";
    var bound = NaN;

    if (spec.family === "exp") {
      var tStar = spec.cNum >= 0 ? hi : lo;
      var M = Math.pow(Math.abs(spec.cNum), n + 1) * Math.exp(spec.cNum * tStar);
      bound = M / fact * Math.pow(absH, n + 1);
      var cText;
      if (eq(spec.c, ONE)) cText = "e^t";
      else if (eq(spec.c, NEG_ONE)) cText = "e^{" + MINUS + "t}";
      else cText = "|" + fmtRat(spec.c) + "|^" + (n + 1) + " e^{(" + fmtRat(spec.c) + ") t}";
      formula = "On the interval from " + fmtNumPlain(lo) + " to " + fmtNumPlain(hi) + ", |f^(" + (n + 1) + ")(t)| = " + cText + " is largest at t = " + fmtNumPlain(tStar) + ". Take M = " + fmtNumPlain(M) + ". Then |R_" + n + "| " + LEQ + " M / " + (n + 1) + "! " + MID + " |x " + MINUS + " a|^" + (n + 1) + " = " + fmtNumPlain(bound) + ".";
    } else if (spec.family === "sin" || spec.family === "cos") {
      var Mc = Math.pow(Math.abs(spec.cNum), n + 1);
      bound = Mc / fact * Math.pow(absH, n + 1);
      formula = "Each derivative of " + functionLabel(spec) + " is " + PLUSMINUS + " c^k times a sine or a cosine, so |f^(" + (n + 1) + ")(t)| " + LEQ + " |" + fmtRat(spec.c) + "|^" + (n + 1) + " = " + fmtNumPlain(Mc) + " for every real t. Then |R_" + n + "| " + LEQ + " " + fmtNumPlain(Mc) + " / " + (n + 1) + "! " + MID + " |x " + MINUS + " a|^" + (n + 1) + " = " + fmtNumPlain(bound) + ". The bound uses |sin| " + LEQ + " 1 and |cos| " + LEQ + " 1, so it can be loose.";
    } else if (spec.family === "ln1p" || spec.family === "ln") {
      var left = spec.family === "ln" ? lo : 1 + lo;
      if (!(left > 0)) {
        return { text: "The interval between a and x leaves the domain, so there is no finite Lagrange bound to print." };
      }
      bound = Math.pow(absH, n + 1) / ((n + 1) * Math.pow(left, n + 1));
      var what = spec.family === "ln" ? "|t|" : "|1 + t|";
      formula = "|f^(" + (n + 1) + ")(t)| = " + n + "! / " + what + "^" + (n + 1) + ". Between a and x the smallest " + what + " is " + fmtNumPlain(left) + ", at the endpoint closer to the singularity. Then |R_" + n + "| " + LEQ + " |x " + MINUS + " a|^" + (n + 1) + " / ((" + (n + 1) + ") " + MID + " " + fmtNumPlain(left) + "^" + (n + 1) + ") = " + fmtNumPlain(bound) + ".";
    } else if (spec.family === "geom") {
      var d1 = Math.abs(1 - lo);
      var d2 = Math.abs(1 - hi);
      var d = Math.min(d1, d2);
      if (!(d > 0)) {
        return { text: "The interval between a and x meets the singularity at x = 1, so there is no finite Lagrange bound." };
      }
      bound = Math.pow(absH, n + 1) / Math.pow(d, n + 2);
      formula = "|f^(" + (n + 1) + ")(t)| = " + (n + 1) + "! / |1 " + MINUS + " t|^" + (n + 2) + ". On the interval the smallest |1 " + MINUS + " t| is " + fmtNumPlain(d) + ". Then |R_" + n + "| " + LEQ + " |x " + MINUS + " a|^" + (n + 1) + " / " + fmtNumPlain(d) + "^" + (n + 2) + " = " + fmtNumPlain(bound) + ".";
    } else if (spec.family === "atan") {
      var tAbs = Math.min(Math.abs(lo), Math.abs(hi));
      if (lo <= 0 && hi >= 0) tAbs = 0;
      var denom = Math.pow(1 + tAbs * tAbs, (n + 1) / 2);
      bound = Math.pow(absH, n + 1) / ((n + 1) * denom);
      formula = "A standard estimate is |f^(" + (n + 1) + ")(t)| " + LEQ + " " + n + "! / (1 + t^2)^{(" + (n + 1) + ")/2}. On the interval that upper estimate is largest where |t| is smallest, here |t| = " + fmtNumPlain(tAbs) + ". Then |R_" + n + "| " + LEQ + " |x " + MINUS + " a|^" + (n + 1) + " / ((" + (n + 1) + ") (1 + " + fmtNumPlain(tAbs) + "^2)^{(" + (n + 1) + ")/2}) = " + fmtNumPlain(bound) + ". This uses |sin| " + LEQ + " 1 inside the closed form for the derivative, so the bound is valid and not always sharp.";
    } else {
      var exp = sub(spec.p, rat(BigInt(n + 1), 1n));
      var fall = falling(spec.p, n + 1);
      var growing = cmpRat(exp, ZERO) >= 0;
      var tPick = growing ? hi : lo;
      var baseAbs = Math.abs(1 + tPick);
      if (!growing && !(1 + lo > 0)) {
        return { text: "The interval between a and x meets x = " + MINUS + "1, so |f^(" + (n + 1) + ")| is unbounded and this page will not print a finite M." };
      }
      var Mpow = Math.abs(ratToNumber(fall)) * Math.pow(baseAbs, ratToNumber(exp));
      bound = Mpow / fact * Math.pow(absH, n + 1);
      formula = "|f^(" + (n + 1) + ")(t)| = |p(p " + MINUS + " 1)" + MID + "..." + MID + "(p " + MINUS + " " + n + ")| " + MID + " |1 + t|^{p " + MINUS + " " + (n + 1) + "}. The exponent on |1 + t| is " + fmtRat(exp) + ", so the maximum on the interval is taken at t = " + fmtNumPlain(tPick) + ". Then |R_" + n + "| " + LEQ + " " + fmtNumPlain(bound) + ".";
    }

    if (!isFinite(bound)) {
      return { text: "A Lagrange bound exists in exact arithmetic for this interval, but the floating-point value overflowed. Shorten |x " + MINUS + " a| or lower the order." };
    }
    return { text: formula + " The absolute error in the check should sit at or below this number. The bound is not the exact error." };
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function checkSection(spec, rows) {
    var lines = [];
    var xText = fmtCenter(spec.xCenter);
    var allRat = true;
    var coeffs = [];
    var k;
    for (k = 0; k < rows.length; k++) {
      coeffs.push(rows[k].coefNumeric);
      if (!rows[k].coefRat) allRat = false;
    }
    var pNum = horner(coeffs, spec.aNum, spec.xNum);
    var pExact = null;
    if (allRat && spec.center.kind === "rat" && spec.xCenter.kind === "rat") {
      pExact = evalExactPoly(rows, spec.center.q, spec.xCenter.q);
      if (pExact) pNum = ratToNumber(pExact);
    }
    var fExact = evalFExact(spec, spec.xCenter);
    var fNum = evalFNumber(spec, spec.xNum);
    var pShow = pExact ? fmtRat(pExact) + " " + MID + " " + fmtNumPlain(pNum) : fmtNumPlain(pNum);
    if (pExact && pExact.d === 1n) pShow = fmtRat(pExact);
    else if (pExact) pShow = fmtRat(pExact) + " \u2248 " + fmtNumPlain(pNum);
    lines.push("P_" + spec.order + "(" + xText + ") = " + pShow + ".");
    if (!isFinite(fNum) && !fExact) {
      lines.push("f(" + xText + ") is not a real number, so there is no absolute error to report. The polynomial value above is still defined.");
    } else {
      if (fExact) fNum = ratToNumber(fExact);
      var fShow = fExact ? (fExact.d === 1n ? fmtRat(fExact) : fmtRat(fExact) + " \u2248 " + fmtNumPlain(fNum)) : fmtNumPlain(fNum);
      var err = Math.abs(fNum - pNum);
      if (fExact && pExact) err = Math.abs(ratToNumber(sub(fExact, pExact)));
      lines.push("f(" + xText + ") = " + fShow + ".");
      lines.push("Absolute error |f(x) " + MINUS + " P_" + spec.order + "(x)| \u2248 " + fmtNumPlain(err) + ".");
    }
    var info = radiusInfo(spec);
    if (isFinite(info.R) && Math.abs(spec.xNum - spec.aNum) > info.R + 1e-9) {
      lines.push("This x lies outside the open interval of convergence. P_n(x) is still a polynomial value. It is only a local match to f, and the infinite series need not approach f(x) here.");
    }
    return { lines: lines, coeffs: coeffs, pNum: pNum, fNum: fNum };
  }

  function buildHtml(spec, rows, poly, info, check, rem) {
    var head = "<p>Each row divides f^(k)(a) by k! to get the coefficient of (x " + MINUS + " a)^k. A zero coefficient is kept in the table and omitted from the polynomial.</p>"
      + "<div style=\"overflow-x:auto\"><table class=\"stat-table\"><thead><tr>"
      + "<th scope=\"col\">k</th><th scope=\"col\">f^(k)(a)</th><th scope=\"col\">k!</th><th scope=\"col\">coefficient</th><th scope=\"col\">term</th>"
      + "</tr></thead><tbody>";
    var i;
    for (i = 0; i < rows.length; i++) {
      var r = rows[i];
      head += "<tr><td>" + r.k + "</td><td>" + esc(r.derivText) + "</td><td>" + esc(r.factText) + "</td><td>" + esc(r.coefText) + "</td><td>" + esc(r.termText) + "</td></tr>";
    }
    head += "</tbody></table></div>";
    var checkHtml = "";
    for (i = 0; i < check.lines.length; i++) checkHtml += "<p>" + esc(check.lines[i]) + "</p>";
    return "<p class=\"detail\" style=\"font-size:1.05rem;color:var(--ink)\">P_" + spec.order + "(x) = " + esc(poly) + "</p>"
      + head
      + "<p><strong>Convergence.</strong> " + esc(info.text) + "</p>"
      + "<p><strong>Numeric check.</strong></p>"
      + checkHtml
      + "<p><strong>Lagrange remainder.</strong> " + esc(rem.text) + "</p>";
  }

  function assertDomain(spec) {
    if (spec.family === "ln1p" && !(spec.aNum > -1)) {
      throw new Error("ln(1 + x) is real only for x > " + MINUS + "1. Choose a center greater than " + MINUS + "1.");
    }
    if (spec.family === "ln" && !(spec.aNum > 0)) {
      throw new Error("ln x is real only for x > 0. Choose a positive center.");
    }
    if (spec.family === "geom" && Math.abs(spec.aNum - 1) < 1e-12) {
      throw new Error("1/(1 " + MINUS + " x) is undefined at x = 1. Choose a different center.");
    }
    if ((spec.family === "sqrt" || (spec.family === "binom" && !nonnegativeInteger(spec.p))) && !(spec.aNum > -1)) {
      throw new Error("This power is real for a center greater than " + MINUS + "1. A nonnegative integer power is the case that allows every center.");
    }
    if (!isFinite(spec.aNum) || Math.abs(spec.aNum) > 40) {
      throw new Error("Choose a center with absolute value at most 40 so the numeric check stays in range.");
    }
    if (!isFinite(spec.xNum) || Math.abs(spec.xNum) > 40) {
      throw new Error("Choose a check point x with absolute value at most 40.");
    }
    if (spec.c && (Math.abs(spec.cNum) > 30 || !isFinite(spec.cNum))) {
      throw new Error("Choose a parameter c with absolute value at most 30.");
    }
    if (spec.p && (Math.abs(spec.pNum) > 30 || !isFinite(spec.pNum))) {
      throw new Error("Choose a power p with absolute value at most 30.");
    }
  }

  function solve(input) {
    var fn = String(input.fn || "exp");
    var families = {
      exp: "exp",
      exp_c: "exp",
      sin: "sin",
      sin_c: "sin",
      cos: "cos",
      cos_c: "cos",
      ln1p: "ln1p",
      ln: "ln",
      geom: "geom",
      atan: "atan",
      sqrt1p: "sqrt",
      binom: "binom"
    };
    var family = families[fn];
    if (!family) throw new Error("Choose a function from the list.");
    var needsC = fn === "exp_c" || fn === "sin_c" || fn === "cos_c";
    var c = ONE;
    if (needsC) {
      if (!String(input.param || "").trim()) throw new Error("Enter the parameter c.");
      c = parseRational(input.param);
    }
    var p = null;
    if (family === "binom") {
      if (!String(input.param || "").trim()) throw new Error("Enter the power p.");
      p = parseRational(input.param);
    }
    if (family === "sqrt") p = rat(1n, 2n);
    var center = parseCenter(input.center);
    var xCenter = parseCenter(input.x);
    var orderText = String(input.order == null ? "" : input.order).trim();
    if (!/^\d+$/.test(orderText)) throw new Error("Order n must be a whole number from 0 to 12.");
    var order = Number(orderText);
    if (order > 12) throw new Error("Order n must be from 0 to 12. Higher orders make the factorial table long without changing the method.");
    var spec = {
      family: family,
      c: c,
      cNum: ratToNumber(c),
      p: p,
      pNum: p ? ratToNumber(p) : 0,
      center: center,
      aNum: centerNumber(center),
      xCenter: xCenter,
      xNum: centerNumber(xCenter),
      order: order
    };
    assertDomain(spec);
    var rows = buildRows(spec);
    var terms = [];
    var i;
    for (i = 0; i < rows.length; i++) {
      if (rows[i].coefShort !== "0") terms.push(rows[i].termText);
    }
    var poly = joinTerms(terms);
    var label = functionLabel(spec);
    var mac = spec.aNum === 0 || (center.kind === "rat" && isZero(center.q));
    var title = mac
      ? "Degree " + order + " Maclaurin polynomial for " + label
      : "Degree " + order + " Taylor polynomial for " + label + " about " + fmtCenter(center);
    var info = radiusInfo(spec);
    var check = checkSection(spec, rows);
    var rem = remainder(spec, rows);
    return {
      title: title,
      polynomial: poly,
      rows: rows,
      convergence: info.text,
      radius: info.R,
      checkLines: check.lines,
      remainder: rem.text,
      html: buildHtml(spec, rows, poly, info, check, rem),
      spec: spec,
      coeffs: check.coeffs,
      window: chooseWindow(spec, spec.aNum, spec.xNum)
    };
  }

  function drawPlot(solved) {
    var canvas = document.getElementById("taylor-plot");
    var legend = document.getElementById("taylor-legend");
    if (!canvas || !canvas.getContext) return;
    var spec = solved.spec;
    var win = solved.window;
    var n = 240;
    var fPts = [];
    var pPts = [];
    var yLo = Infinity;
    var yHi = -Infinity;
    var anchor = evalFNumber(spec, spec.aNum);
    if (!isFinite(anchor)) anchor = 0;
    var cap = Math.max(8, 12 * Math.max(1, Math.abs(anchor)));
    var i;
    for (i = 0; i <= n; i++) {
      var x = win.lo + (win.hi - win.lo) * i / n;
      var fv = evalFNumber(spec, x);
      var pv = horner(solved.coeffs, spec.aNum, x);
      fPts.push({ x: x, y: fv });
      pPts.push({ x: x, y: pv });
      [fv, pv].forEach(function (y) {
        if (isFinite(y) && Math.abs(y) <= cap) {
          if (y < yLo) yLo = y;
          if (y > yHi) yHi = y;
        }
      });
    }
    if (!isFinite(yLo) || !isFinite(yHi) || yHi === yLo) {
      yLo = anchor - 1;
      yHi = anchor + 1;
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
    function xPix(xv) { return padL + (xv - win.lo) / (win.hi - win.lo) * plotW; }
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
    if (win.lo < 0 && win.hi > 0) {
      ctx.moveTo(xPix(0), padT);
      ctx.lineTo(xPix(0), padT + plotH);
    }
    ctx.stroke();

    function stroke(pts, color, dash) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash(dash);
      var pen = false;
      var j;
      for (j = 0; j < pts.length; j++) {
        var y = pts[j].y;
        if (!isFinite(y) || y < yLo || y > yHi) {
          pen = false;
          continue;
        }
        var px = xPix(pts[j].x);
        var py = yPix(y);
        if (!pen) {
          ctx.moveTo(px, py);
          pen = true;
        } else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    stroke(fPts, "#243a61", []);
    stroke(pPts, "#8b5a2b", [6, 4]);

    ctx.beginPath();
    ctx.fillStyle = "#243a61";
    ctx.arc(xPix(spec.aNum), yPix(anchor), 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#4a5160";
    ctx.font = "12px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(fmtNumPlain(win.lo), padL, padT + plotH + 6);
    ctx.fillText(fmtNumPlain(win.hi), padL + plotW, padT + plotH + 6);

    var summary = "Graph from x = " + fmtNumPlain(win.lo) + " to x = " + fmtNumPlain(win.hi)
      + ". Solid curve: " + functionLabel(spec) + ". Dashed curve: the degree-" + spec.order
      + " polynomial. The dot marks the center.";
    canvas.setAttribute("aria-label", summary);
    if (legend) legend.textContent = summary;
  }

  function showError(message) {
    var error = document.getElementById("taylor-error");
    var result = document.getElementById("taylor-result");
    if (error) {
      error.textContent = message;
      error.classList.add("visible");
    }
    if (result) result.classList.remove("visible");
  }

  var lastSolved = null;

  function render(solved) {
    var error = document.getElementById("taylor-error");
    var result = document.getElementById("taylor-result");
    var amount = document.getElementById("taylor-amount");
    var detail = document.getElementById("taylor-detail");
    if (error) {
      error.textContent = "";
      error.classList.remove("visible");
    }
    if (amount) amount.textContent = solved.title;
    if (detail) detail.innerHTML = solved.html;
    if (result) result.classList.add("visible");
    lastSolved = solved;
    drawPlot(solved);
  }

  function needsParam(fn) {
    return fn === "exp_c" || fn === "sin_c" || fn === "cos_c" || fn === "binom";
  }

  function syncParam() {
    var fn = document.getElementById("taylor-fn");
    var wrap = document.getElementById("taylor-param-wrap");
    var label = document.getElementById("taylor-param-label");
    var input = document.getElementById("taylor-param");
    if (!fn || !wrap || !label || !input) return;
    var on = needsParam(fn.value);
    wrap.hidden = !on;
    if (!on) return;
    if (fn.value === "binom") {
      label.textContent = "Power p";
      if (!input.value || input.dataset.role !== "p") input.value = "3";
      input.dataset.role = "p";
    } else {
      label.textContent = "Parameter c";
      if (!input.value || input.dataset.role !== "c") input.value = "2";
      input.dataset.role = "c";
    }
  }

  function readForm() {
    return {
      fn: document.getElementById("taylor-fn").value,
      param: document.getElementById("taylor-param").value,
      center: document.getElementById("taylor-a").value,
      order: document.getElementById("taylor-n").value,
      x: document.getElementById("taylor-x").value
    };
  }

  function fill(values) {
    document.getElementById("taylor-fn").value = values.fn;
    document.getElementById("taylor-param").value = values.param;
    document.getElementById("taylor-param").dataset.role = values.fn === "binom" ? "p" : "c";
    document.getElementById("taylor-a").value = values.center;
    document.getElementById("taylor-n").value = values.order;
    document.getElementById("taylor-x").value = values.x;
    syncParam();
  }

  var PRESETS = [
    { id: "taylor-preset-exp", fn: "exp", param: "", center: "0", order: "4", x: "1/2" },
    { id: "taylor-preset-sin", fn: "sin", param: "", center: "0", order: "5", x: "0.3" },
    { id: "taylor-preset-ln", fn: "ln1p", param: "", center: "0", order: "4", x: "1/2" },
    { id: "taylor-preset-shift", fn: "exp", param: "", center: "1", order: "3", x: "1.2" },
    { id: "taylor-preset-geom", fn: "geom", param: "", center: "0", order: "4", x: "1/2" }
  ];

  function run() {
    try {
      render(solve(readForm()));
    } catch (err) {
      showError(err && err.message ? err.message : "The polynomial could not be built.");
    }
  }

  function boot() {
    var form = document.getElementById("taylor-form");
    if (!form) return;
    syncParam();
    var fn = document.getElementById("taylor-fn");
    if (fn) fn.addEventListener("change", syncParam);
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      run();
    });
    var reset = document.getElementById("taylor-reset");
    if (reset) {
      reset.addEventListener("click", function () {
        fill(PRESETS[0]);
        run();
      });
    }
    PRESETS.forEach(function (preset) {
      var button = document.getElementById(preset.id);
      if (!button) return;
      button.addEventListener("click", function () {
        fill(preset);
        run();
      });
    });
    window.addEventListener("resize", function () {
      if (lastSolved) drawPlot(lastSolved);
    });
    run();
  }

  return {
    solve: solve,
    parseCenter: parseCenter,
    fmtRat: fmtRat,
    boot: boot,
    MINUS: MINUS,
    SQRT: SQRT,
    PI: PI
  };
});
