/* Exact solver for a y'' + b y' + c y = 0. Rational arithmetic and square roots, no libraries. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.SecondOrderOde = api;
  if (typeof document !== "undefined") api.boot();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MINUS = "\u2212";
  var SQRT = "\u221A";
  var SUB1 = "\u2081";
  var SUB2 = "\u2082";
  var C1 = "C" + SUB1;
  var C2 = "C" + SUB2;

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
        var pairs = Math.floor(count / 2);
        if (pairs > 0) coef *= p ** BigInt(pairs);
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

  function surd(a, b, rad) {
    rad = BigInt(rad);
    if (rad < 0n) throw new Error("Internal square root was negative.");
    if (b.n === 0n || rad === 0n) return { a: a, b: ZERO, rad: 0n };
    if (rad > 1n) {
      var parts = stripSquares(rad);
      if (parts.coef !== 1n || parts.rad !== rad) {
        return surd(a, mul(b, rat(parts.coef, 1n)), parts.rad);
      }
    }
    if (rad === 1n) return { a: add(a, b), b: ZERO, rad: 0n };
    return { a: a, b: b, rad: rad };
  }

  var SURD0 = surd(ZERO, ZERO, 0n);

  function ratSurd(q) { return surd(q, ZERO, 0n); }

  function isZeroSurd(u) { return u.a.n === 0n && u.b.n === 0n; }

  function eqSurd(u, v) {
    return u.rad === v.rad && eq(u.a, v.a) && eq(u.b, v.b);
  }

  function fieldRad(u, v) {
    var ur = u.b.n === 0n ? 0n : u.rad;
    var vr = v.b.n === 0n ? 0n : v.rad;
    if (ur === 0n) return vr;
    if (vr === 0n) return ur;
    if (ur !== vr) throw new Error("Internal arithmetic left the quadratic field.");
    return ur;
  }

  function embed(u, rad) {
    if (u.b.n === 0n || u.rad === 0n) return { a: u.a, b: ZERO, rad: rad };
    if (u.rad !== rad) throw new Error("Internal arithmetic left the quadratic field.");
    return u;
  }

  function addSurd(u, v) {
    var rad = fieldRad(u, v);
    if (rad === 0n) return ratSurd(add(u.a, v.a));
    var uu = embed(u, rad);
    var vv = embed(v, rad);
    return surd(add(uu.a, vv.a), add(uu.b, vv.b), rad);
  }

  function subSurd(u, v) { return addSurd(u, surd(neg(v.a), neg(v.b), v.rad)); }

  function mulSurd(u, v) {
    if (isZeroSurd(u) || isZeroSurd(v)) return SURD0;
    var rad = fieldRad(u, v);
    if (rad === 0n) return ratSurd(mul(u.a, v.a));
    var uu = embed(u, rad);
    var vv = embed(v, rad);
    var ac = mul(uu.a, vv.a);
    var bd = mul(mul(uu.b, vv.b), rat(rad, 1n));
    var cross = add(mul(uu.a, vv.b), mul(uu.b, vv.a));
    return surd(add(ac, bd), cross, rad);
  }

  function divSurd(u, v) {
    if (isZeroSurd(v)) throw new Error("Division by zero.");
    var rad = fieldRad(u, v);
    if (rad === 0n) return ratSurd(div(u.a, v.a));
    var vv = embed(v, rad);
    var norm = sub(mul(vv.a, vv.a), mul(mul(vv.b, vv.b), rat(rad, 1n)));
    if (isZero(norm)) throw new Error("Division by zero.");
    var numer = mulSurd(embed(u, rad), surd(vv.a, neg(vv.b), rad));
    return surd(div(numer.a, norm), div(numer.b, norm), rad);
  }

  function signSurd(u) {
    if (isZeroSurd(u)) return 0;
    if (u.b.n === 0n || u.rad === 0n) return u.a.n < 0n ? -1 : 1;
    if (u.a.n >= 0n && u.b.n >= 0n) return 1;
    if (u.a.n <= 0n && u.b.n <= 0n) return -1;
    var aa = mul(u.a, u.a);
    var bb = mul(mul(u.b, u.b), rat(u.rad, 1n));
    if (u.b.n > 0n) return cmpRat(bb, aa);
    return cmpRat(aa, bb);
  }

  function cmpSurd(u, v) { return signSurd(subSurd(u, v)); }

  function fmtSqrtInt(q, rad) {
    var root = SQRT + rad.toString();
    if (q === 1n) return root;
    return q.toString() + root;
  }

  function fmtSurd(s) {
    if (s.b.n === 0n || s.rad === 0n) return fmtRat(s.a);
    var den = lcm(s.a.d, s.b.d);
    var p = s.a.n * (den / s.a.d);
    var q = s.b.n * (den / s.b.d);
    if (p === 0n) {
      var mag = q < 0n ? -q : q;
      var body0 = fmtSqrtInt(mag, s.rad);
      var signed0 = q < 0n ? MINUS + body0 : body0;
      if (den === 1n) return signed0;
      return (q < 0n ? MINUS : "") + "(" + body0 + ")/" + den.toString();
    }
    var outer = "";
    if (p < 0n && q < 0n) {
      outer = MINUS;
      p = -p;
      q = -q;
    }
    var inner;
    if (p < 0n && q > 0n) inner = fmtSqrtInt(q, s.rad) + " " + MINUS + " " + (-p).toString();
    else if (q < 0n) inner = p.toString() + " " + MINUS + " " + fmtSqrtInt(-q, s.rad);
    else inner = p.toString() + " + " + fmtSqrtInt(q, s.rad);
    var body = den === 1n ? inner : "(" + inner + ")/" + den.toString();
    if (outer) {
      if (den === 1n) return MINUS + "(" + inner + ")";
      return MINUS + body;
    }
    return body;
  }

  function needsParens(text) {
    return text.indexOf(" ") >= 0 || text.indexOf("/") >= 0;
  }

  function wrapFactor(text) {
    if (text.charAt(0) === MINUS || needsParens(text)) return "(" + text + ")";
    return text;
  }

  function fmtQuotient(numer, denomRat) {
    return wrapFactor(fmtSurd(numer)) + " / " + wrapFactor(fmtRat(denomRat));
  }

  function fmtConst(coef, exponent) {
    if (isZeroSurd(coef)) return "0";
    var c = fmtSurd(coef);
    if (isZeroSurd(exponent)) return c;
    var e = "e^(" + fmtSurd(exponent) + ")";
    if (c === "1") return e;
    if (c === MINUS + "1") return MINUS + e;
    if (needsParens(c)) return "(" + c + ") " + e;
    return c + " " + e;
  }

  function fmtLeadingCoef(coef, symbol) {
    if (eq(coef, ONE)) return symbol;
    if (eq(coef, NEG_ONE)) return MINUS + symbol;
    if (coef.d !== 1n) return "(" + fmtRat(coef) + ")" + symbol;
    return fmtRat(coef) + symbol;
  }

  function fmtNextCoef(coef, symbol) {
    var negCoef = coef.n < 0n;
    var mag = absRat(coef);
    var body;
    if (eq(mag, ONE)) body = symbol;
    else if (mag.d !== 1n) body = "(" + fmtRat(mag) + ")" + symbol;
    else body = fmtRat(mag) + symbol;
    return negCoef ? " " + MINUS + " " + body : " + " + body;
  }

  function fmtNamedPoly(items) {
    var parts = [];
    for (var i = 0; i < items.length; i++) {
      if (!isZero(items[i].coef)) parts.push(items[i]);
    }
    if (!parts.length) return "0";
    var s = fmtLeadingCoef(parts[0].coef, parts[0].symbol);
    for (var k = 1; k < parts.length; k++) s += fmtNextCoef(parts[k].coef, parts[k].symbol);
    return s;
  }

  function fmtODE(a, b, c) {
    return fmtNamedPoly([
      { coef: a, symbol: "y''" },
      { coef: b, symbol: "y'" },
      { coef: c, symbol: "y" }
    ]) + " = 0";
  }

  function fmtConstantTerm(base, constant) {
    if (isZero(constant)) return base;
    if (base === "0") return fmtRat(constant);
    if (constant.n < 0n) return base + " " + MINUS + " " + fmtRat(absRat(constant));
    return base + " + " + fmtRat(constant);
  }

  function fmtChar(a, b, c) {
    var base = fmtNamedPoly([
      { coef: a, symbol: "r\u00B2" },
      { coef: b, symbol: "r" }
    ]);
    return fmtConstantTerm(base, c) + " = 0";
  }

  function fmtExpX(root) {
    if (isZeroSurd(root)) return "";
    if (root.b.n === 0n || root.rad === 0n) {
      var a = root.a;
      if (eq(a, ONE)) return "e^x";
      if (eq(a, NEG_ONE)) return "e^(" + MINUS + "x)";
      if (a.d === 1n) {
        var sign = a.n < 0n ? MINUS : "";
        var mag = a.n < 0n ? -a.n : a.n;
        return "e^(" + sign + mag.toString() + "x)";
      }
      if (a.n < 0n) return "e^(" + MINUS + "(" + fmtRat(absRat(a)) + ")x)";
      return "e^((" + fmtRat(a) + ")x)";
    }
    return "e^((" + fmtSurd(root) + ") x)";
  }

  function fmtAngle(beta) {
    if ((beta.b.n === 0n || beta.rad === 0n) && eq(beta.a, ONE)) return "x";
    if (beta.b.n === 0n || beta.rad === 0n) {
      if (beta.a.d === 1n) return beta.a.n.toString() + "x";
      return "(" + fmtRat(beta.a) + ")x";
    }
    return "(" + fmtSurd(beta) + ") x";
  }

  function fmtTrig(name, beta) {
    var arg = fmtAngle(beta);
    if (arg === "x") return name + " x";
    return name + "(" + arg + ")";
  }

  function attachExp(constText, expText) {
    if (constText === "0") return "0";
    if (!expText) return constText;
    if (constText === "1") return expText;
    if (constText === MINUS + "1") return MINUS + expText;
    if (needsParens(constText)) return "(" + constText + ") " + expText;
    return constText + " " + expText;
  }

  function joinPieces(pieces) {
    var kept = [];
    for (var i = 0; i < pieces.length; i++) {
      if (pieces[i] && pieces[i] !== "0") kept.push(pieces[i]);
    }
    if (!kept.length) return "0";
    var s = kept[0];
    for (var k = 1; k < kept.length; k++) {
      var p = kept[k];
      if (p.charAt(0) === MINUS) s += " " + MINUS + " " + p.slice(1);
      else s += " + " + p;
    }
    return s;
  }

  function fmtTimesX(constText) {
    if (constText === "0") return "0";
    if (constText === "1") return "x";
    if (constText === MINUS + "1") return MINUS + "x";
    if (needsParens(constText)) return "(" + constText + ") x";
    return constText + " x";
  }

  function fmtLinear(c1text, c2text) {
    if (c2text === "0") return c1text;
    var xterm = fmtTimesX(c2text);
    if (c1text === "0") return xterm;
    if (xterm.charAt(0) === MINUS) return c1text + " " + MINUS + " " + xterm.slice(1);
    return c1text + " + " + xterm;
  }

  function parseEntry(raw, label) {
    var where = label ? " for " + label : "";
    var s = String(raw == null ? "" : raw).trim().replace(/\s+/g, "");
    s = s.replace(/[\u2212\u2013\u2014]/g, "-");
    if (!s) throw new Error("Enter an integer, a decimal, or a fraction such as 3/4" + where + ".");
    var frac = s.match(/^([+-]?)(\d+)\/([+-]?)(\d+)$/);
    if (frac) {
      if (frac[2].length > 18 || frac[4].length > 18) {
        throw new Error("Use 18 digits or fewer" + where + ".");
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
    if (digits.length > 18) throw new Error("Use 18 digits or fewer" + where + ".");
    var den = 10n ** BigInt(places);
    return rat(sign * BigInt(digits), den);
  }

  function ratToNumber(q) {
    return Number(q.n) / Number(q.d);
  }

  function surdToNumber(s) {
    var base = ratToNumber(s.a);
    if (s.b.n === 0n || s.rad === 0n) return base;
    return base + ratToNumber(s.b) * Math.sqrt(Number(s.rad));
  }

  function constToNumber(coef, exponent) {
    var mag = surdToNumber(coef);
    if (mag === 0) return 0;
    var power = surdToNumber(exponent);
    var e = power === 0 ? 1 : Math.exp(power);
    return mag * e;
  }

  function fmtDecimal(x) {
    if (!isFinite(x)) return "not a finite number";
    if (Object.is(x, -0) || Math.abs(x) < 1e-12) return "0";
    var abs = Math.abs(x);
    var text;
    if (abs >= 1e7 || abs < 1e-4) text = x.toExponential(6).replace("e", " \u00D7 10^");
    else text = x.toPrecision(10);
    if (text.indexOf("e") === -1 && text.indexOf("\u00D7") === -1 && text.indexOf(".") >= 0) {
      text = text.replace(/0+$/, "").replace(/\.$/, "");
    }
    return text.replace("-", MINUS);
  }

  function sqrtOfNonnegative(q) {
    if (q.n < 0n) throw new Error("Internal square root was negative.");
    if (q.n === 0n) return SURD0;
    var parts = stripSquares(q.n * q.d);
    return surd(ZERO, rat(parts.coef, q.d), parts.rad);
  }

  function generalDistinct(r1, r2) {
    return "y = " + joinPieces([
      attachExp(C1, fmtExpX(r1)),
      attachExp(C2, fmtExpX(r2))
    ]);
  }

  function generalRepeated(r) {
    var expText = fmtExpX(r);
    var linear = C1 + " + " + C2 + " x";
    if (!expText) return "y = " + linear;
    return "y = (" + linear + ") " + expText;
  }

  function generalComplex(alpha, beta) {
    var osc = C1 + " " + fmtTrig("cos", beta) + " + " + C2 + " " + fmtTrig("sin", beta);
    var env = fmtExpX(ratSurd(alpha));
    if (!env) return "y = " + osc;
    return "y = " + env + " (" + osc + ")";
  }

  function particularDistinct(c1text, c2text, r1, r2) {
    return "y = " + joinPieces([
      attachExp(c1text, fmtExpX(r1)),
      attachExp(c2text, fmtExpX(r2))
    ]);
  }

  function particularRepeated(c1text, c2text, r) {
    var linear = fmtLinear(c1text, c2text);
    var expText = fmtExpX(r);
    if (!expText) return "y = " + linear;
    if (linear.indexOf(" ") >= 0 || linear.indexOf("+") >= 0) return "y = (" + linear + ") " + expText;
    return "y = " + attachExp(linear, expText);
  }

  function particularComplex(c1text, c2text, alpha, beta) {
    var cosText = attachExp(c1text, fmtTrig("cos", beta));
    var sinText = attachExp(c2text, fmtTrig("sin", beta));
    var osc = joinPieces([cosText, sinText]);
    var env = fmtExpX(ratSurd(alpha));
    if (!env) return "y = " + osc;
    if (osc.indexOf(" ") >= 0) return "y = " + env + " (" + osc + ")";
    return "y = " + attachExp(osc, env);
  }

  function evalY(numeric, x) {
    var c1 = numeric.c1;
    var c2 = numeric.c2;
    if (numeric.caseName === "distinct") {
      return c1 * Math.exp(numeric.r1 * x) + c2 * Math.exp(numeric.r2 * x);
    }
    if (numeric.caseName === "repeated") {
      return (c1 + c2 * x) * Math.exp(numeric.r * x);
    }
    return Math.exp(numeric.alpha * x) * (c1 * Math.cos(numeric.beta * x) + c2 * Math.sin(numeric.beta * x));
  }

  function evalYp(numeric, x) {
    var c1 = numeric.c1;
    var c2 = numeric.c2;
    if (numeric.caseName === "distinct") {
      return c1 * numeric.r1 * Math.exp(numeric.r1 * x) + c2 * numeric.r2 * Math.exp(numeric.r2 * x);
    }
    if (numeric.caseName === "repeated") {
      var r = numeric.r;
      return (c2 + r * (c1 + c2 * x)) * Math.exp(r * x);
    }
    var y = evalY(numeric, x);
    var oscP = -c1 * numeric.beta * Math.sin(numeric.beta * x) + c2 * numeric.beta * Math.cos(numeric.beta * x);
    return numeric.alpha * y + Math.exp(numeric.alpha * x) * oscP;
  }

  function assertPolyZero(a, b, c, r, label) {
    var value = addSurd(addSurd(mulSurd(ratSurd(a), mulSurd(r, r)), mulSurd(ratSurd(b), r)), ratSurd(c));
    if (!isZeroSurd(value)) {
      throw new Error("Characteristic polynomial check failed at " + label + ".");
    }
  }

  function solve(input) {
    var a = input.a;
    var b = input.b;
    var c = input.c;
    if (!a || a.n === undefined) a = parseEntry(input.a, "a");
    if (!b || b.n === undefined) b = parseEntry(input.b, "b");
    if (!c || c.n === undefined) c = parseEntry(input.c, "c");
    if (isZero(a)) {
      throw new Error("The leading coefficient a has to be nonzero. If a is 0, the equation is first order.");
    }

    var hasSlot = [input.x0, input.y0, input.v0].map(function (value) {
      return String(value == null ? "" : value).trim() !== "";
    });
    var icCount = hasSlot[0] + hasSlot[1] + hasSlot[2];
    if (icCount !== 0 && icCount !== 3) {
      throw new Error("Initial conditions come as a triple. Enter x\u2080, y(x\u2080), and y'(x\u2080), or leave all three blank.");
    }
    var hasIC = icCount === 3;
    var x0 = hasIC ? parseEntry(input.x0, "x\u2080") : ZERO;
    var y0 = hasIC ? parseEntry(input.y0, "y(x\u2080)") : ZERO;
    var v0 = hasIC ? parseEntry(input.v0, "y'(x\u2080)") : ZERO;

    var b2 = mul(b, b);
    var fourac = mul(rat(4n, 1n), mul(a, c));
    var disc = sub(b2, fourac);
    var twoA = mul(rat(2n, 1n), a);
    var lines = [];
    lines.push("Equation");
    lines.push(fmtODE(a, b, c));
    lines.push("");
    lines.push("Look for solutions of the form y = e^(rx), where r is constant. Then y' = r e^(rx) and y'' = r\u00B2 e^(rx). Substitute those into the differential equation. Every term contains e^(rx), and that factor is never zero, so it cancels.");
    lines.push("");
    lines.push("Characteristic equation");
    lines.push(fmtChar(a, b, c));
    lines.push("");
    lines.push("Discriminant");
    lines.push("\u0394 = b\u00B2 \u2212 4ac.");
    lines.push("b\u00B2 = (" + fmtRat(b) + ")\u00B2 = " + fmtRat(b2) + ".");
    lines.push("4ac = 4(" + fmtRat(a) + ")(" + fmtRat(c) + ") = " + fmtRat(fourac) + ".");
    if (fourac.n < 0n) {
      lines.push("\u0394 = " + fmtRat(b2) + " \u2212 (" + fmtRat(fourac) + ") = " + fmtRat(disc) + ".");
    } else {
      lines.push("\u0394 = " + fmtRat(b2) + " \u2212 " + fmtRat(fourac) + " = " + fmtRat(disc) + ".");
    }

    var caseName;
    var r1 = null;
    var r2 = null;
    var r = null;
    var alpha = null;
    var beta = null;
    var general;
    var sqrtDisc = null;

    if (disc.n > 0n) {
      caseName = "distinct";
      sqrtDisc = sqrtOfNonnegative(disc);
      var numPlus = addSurd(ratSurd(neg(b)), sqrtDisc);
      var numMinus = subSurd(ratSurd(neg(b)), sqrtDisc);
      var rootPlus = divSurd(numPlus, ratSurd(twoA));
      var rootMinus = divSurd(numMinus, ratSurd(twoA));
      if (cmpSurd(rootPlus, rootMinus) >= 0) {
        r1 = rootPlus;
        r2 = rootMinus;
      } else {
        r1 = rootMinus;
        r2 = rootPlus;
      }
      assertPolyZero(a, b, c, r1, "r\u2081");
      assertPolyZero(a, b, c, r2, "r\u2082");
      general = generalDistinct(r1, r2);
      lines.push("");
      lines.push("The discriminant is positive, so the characteristic equation has two different real roots.");
      lines.push("r = (\u2212b \u00B1 \u221A\u0394) / (2a).");
      lines.push("\u221A\u0394 = " + fmtSurd(sqrtDisc) + ".");
      lines.push("r" + SUB1 + " = " + fmtQuotient(cmpSurd(rootPlus, rootMinus) >= 0 ? numPlus : numMinus, twoA) + " = " + fmtSurd(r1) + ".");
      lines.push("r" + SUB2 + " = " + fmtQuotient(cmpSurd(rootPlus, rootMinus) >= 0 ? numMinus : numPlus, twoA) + " = " + fmtSurd(r2) + ".");
      lines.push("The larger root is written first.");
      lines.push("");
      lines.push("General solution");
      lines.push(general + ".");
      lines.push("Each pure exponential uses one root. The two constants are free until an initial condition fixes them.");
    } else if (disc.n === 0n) {
      caseName = "repeated";
      r = ratSurd(div(neg(b), twoA));
      assertPolyZero(a, b, c, r, "r");
      general = generalRepeated(r);
      lines.push("");
      lines.push("The discriminant is zero, so there is one repeated real root.");
      lines.push("r = \u2212b / (2a) = " + fmtQuotient(ratSurd(neg(b)), twoA) + " = " + fmtSurd(r) + ".");
      lines.push("");
      lines.push("General solution");
      lines.push(general + ".");
      lines.push("A repeated root does not produce two independent pure exponentials. The second solution is x times e^(rx), which is why one constant multiplies x.");
    } else {
      caseName = "complex";
      alpha = div(neg(b), twoA);
      var sqrtNeg = sqrtOfNonnegative(neg(disc));
      var absTwo = twoA.n < 0n ? neg(twoA) : twoA;
      beta = divSurd(sqrtNeg, ratSurd(absTwo));
      if (signSurd(beta) <= 0) throw new Error("Internal imaginary part was not positive.");
      var alphaS = ratSurd(alpha);
      var left = addSurd(
        addSurd(mulSurd(ratSurd(a), subSurd(mulSurd(alphaS, alphaS), mulSurd(beta, beta))), mulSurd(ratSurd(b), alphaS)),
        ratSurd(c)
      );
      if (!isZeroSurd(left)) throw new Error("Complex-root check failed.");
      general = generalComplex(alpha, beta);
      lines.push("");
      lines.push("The discriminant is negative, so the roots are complex conjugates. They are not a pair of real numbers.");
      lines.push("Write \u221A\u0394 = i \u221A(\u2212\u0394). The real part and the imaginary part are");
      lines.push("\u03B1 = \u2212b / (2a) = " + fmtQuotient(ratSurd(neg(b)), twoA) + " = " + fmtRat(alpha) + ".");
      lines.push("\u03B2 = \u221A(\u2212\u0394) / (2|a|) = " + fmtSurd(sqrtNeg) + " / " + fmtRat(absTwo) + " = " + fmtSurd(beta) + ".");
      lines.push("The roots are " + fmtRat(alpha) + " \u00B1 " + fmtSurd(beta) + " i.");
      lines.push("Euler's formula turns e^((\u03B1 \u00B1 \u03B2 i)x) into an exponential times cosine and sine. The real general solution keeps both.");
      lines.push("");
      lines.push("General solution");
      lines.push(general + ".");
    }

    var c1Coef = null;
    var c1Exp = null;
    var c2Coef = null;
    var c2Exp = null;
    var c1text = null;
    var c2text = null;
    var particular = null;
    var numericC1;
    var numericC2;
    var decimalsAreFallback = false;

    if (!hasIC) {
      lines.push("");
      lines.push("No initial conditions were entered, so " + C1 + " and " + C2 + " stay arbitrary.");
      lines.push("The plot uses the sample choice " + C1 + " = 1 and " + C2 + " = 1. That curve is one member of the family, not every solution.");
      numericC1 = 1;
      numericC2 = 1;
    } else {
      lines.push("");
      lines.push("Initial conditions");
      lines.push("y(" + fmtRat(x0) + ") = " + fmtRat(y0) + ".");
      lines.push("y'(" + fmtRat(x0) + ") = " + fmtRat(v0) + ".");
      lines.push("");
      if (caseName === "distinct") {
        var diff = subSurd(r2, r1);
        var alg1 = divSurd(subSurd(mulSurd(ratSurd(y0), r2), ratSurd(v0)), diff);
        var alg2 = divSurd(subSurd(ratSurd(v0), mulSurd(ratSurd(y0), r1)), diff);
        c1Coef = alg1;
        c1Exp = mulSurd(surd(neg(x0), ZERO, 0n), r1);
        c2Coef = alg2;
        c2Exp = mulSurd(ratSurd(neg(x0)), r2);
        if (!isZeroSurd(addSurd(addSurd(c1Coef, c2Coef), ratSurd(neg(y0)))) && isZero(x0)) {
          throw new Error("Initial-value check failed for y.");
        }
        if (isZero(x0)) {
          var slope0 = addSurd(mulSurd(r1, c1Coef), mulSurd(r2, c2Coef));
          if (!isZeroSurd(subSurd(slope0, ratSurd(v0)))) throw new Error("Initial-value check failed for y'.");
        }
        c1text = fmtConst(c1Coef, c1Exp);
        c2text = fmtConst(c2Coef, c2Exp);
        numericC1 = constToNumber(c1Coef, c1Exp);
        numericC2 = constToNumber(c2Coef, c2Exp);
        decimalsAreFallback = !isZeroSurd(c1Exp) || !isZeroSurd(c2Exp);
        lines.push("Differentiate the general solution.");
        lines.push("y' = " + C1 + " (" + fmtSurd(r1) + ") " + (fmtExpX(r1) || "1") + " + " + C2 + " (" + fmtSurd(r2) + ") " + (fmtExpX(r2) || "1") + ".");
        lines.push("");
        lines.push("Substitute x = " + fmtRat(x0) + ". The unknown constants satisfy the 2 by 2 system");
        lines.push(C1 + " e^(" + fmtSurd(mulSurd(r1, ratSurd(x0))) + ") + " + C2 + " e^(" + fmtSurd(mulSurd(r2, ratSurd(x0))) + ") = " + fmtRat(y0) + ".");
        lines.push("(" + fmtSurd(r1) + ") " + C1 + " e^(" + fmtSurd(mulSurd(r1, ratSurd(x0))) + ") + (" + fmtSurd(r2) + ") " + C2 + " e^(" + fmtSurd(mulSurd(r2, ratSurd(x0))) + ") = " + fmtRat(v0) + ".");
        lines.push("");
        lines.push("Multiply the first equation by r" + SUB2 + " and subtract the second equation. The " + C2 + " terms cancel.");
        lines.push(C1 + " = (y\u2080 r" + SUB2 + " \u2212 y'\u2080) / ((r" + SUB2 + " \u2212 r" + SUB1 + ") e^(r" + SUB1 + " x\u2080)) = " + c1text + ".");
        lines.push(C2 + " = (y'\u2080 \u2212 y\u2080 r" + SUB1 + ") / ((r" + SUB2 + " \u2212 r" + SUB1 + ") e^(r" + SUB2 + " x\u2080)) = " + c2text + ".");
        lines.push("Here r" + SUB2 + " \u2212 r" + SUB1 + " = " + fmtSurd(diff) + ", y\u2080 r" + SUB2 + " \u2212 y'\u2080 = " + fmtSurd(subSurd(mulSurd(ratSurd(y0), r2), ratSurd(v0))) + ", and y'\u2080 \u2212 y\u2080 r" + SUB1 + " = " + fmtSurd(subSurd(ratSurd(v0), mulSurd(ratSurd(y0), r1))) + ".");
      } else if (caseName === "repeated") {
        var bracket = sub(v0, mul(r.a, y0));
        c2Coef = ratSurd(bracket);
        c2Exp = ratSurd(neg(mul(r.a, x0)));
        var algC1 = sub(y0, mul(x0, bracket));
        c1Coef = ratSurd(algC1);
        c1Exp = c2Exp;
        if (isZero(x0)) {
          if (!eq(c1Coef.a, y0)) throw new Error("Initial-value check failed for y.");
          if (!eq(add(c2Coef.a, mul(r.a, c1Coef.a)), v0)) throw new Error("Initial-value check failed for y'.");
        }
        c1text = fmtConst(c1Coef, c1Exp);
        c2text = fmtConst(c2Coef, c2Exp);
        numericC1 = constToNumber(c1Coef, c1Exp);
        numericC2 = constToNumber(c2Coef, c2Exp);
        decimalsAreFallback = !isZero(x0) && !isZero(r.a);
        lines.push("Differentiate y = (" + C1 + " + " + C2 + " x) e^(rx).");
        lines.push("The product rule gives y' = (" + C2 + " + r (" + C1 + " + " + C2 + " x)) e^(rx).");
        lines.push("");
        lines.push("Substitute x = " + fmtRat(x0) + ".");
        lines.push("(" + C1 + " + " + C2 + " (" + fmtRat(x0) + ")) e^(" + fmtRat(mul(r.a, x0)) + ") = " + fmtRat(y0) + ".");
        lines.push("(" + C2 + " + (" + fmtSurd(r) + ")(" + C1 + " + " + C2 + " (" + fmtRat(x0) + "))) e^(" + fmtRat(mul(r.a, x0)) + ") = " + fmtRat(v0) + ".");
        lines.push("");
        lines.push("The second equation simplifies once the first one replaces (" + C1 + " + " + C2 + " x\u2080) e^(r x\u2080) with y\u2080.");
        lines.push(C2 + " = (y'\u2080 \u2212 r y\u2080) e^(\u2212r x\u2080) = " + c2text + ".");
        lines.push(C1 + " = (y\u2080 \u2212 x\u2080 (y'\u2080 \u2212 r y\u2080)) e^(\u2212r x\u2080) = " + c1text + ".");
        lines.push("The algebraic pieces are y'\u2080 \u2212 r y\u2080 = " + fmtRat(bracket) + " and y\u2080 \u2212 x\u2080 (y'\u2080 \u2212 r y\u2080) = " + fmtRat(algC1) + ".");
      } else {
        var betaN = surdToNumber(beta);
        var alphaN = ratToNumber(alpha);
        var x0n = ratToNumber(x0);
        var y0n = ratToNumber(y0);
        var v0n = ratToNumber(v0);
        if (isZero(x0)) {
          c1Coef = ratSurd(y0);
          c1Exp = SURD0;
          c2Coef = divSurd(ratSurd(sub(v0, mul(alpha, y0))), beta);
          c2Exp = SURD0;
          if (!isZeroSurd(subSurd(addSurd(ratSurd(mul(alpha, y0)), mulSurd(beta, c2Coef)), ratSurd(v0)))) {
            throw new Error("Initial-value check failed for y'.");
          }
          c1text = fmtConst(c1Coef, c1Exp);
          c2text = fmtConst(c2Coef, c2Exp);
          numericC1 = constToNumber(c1Coef, c1Exp);
          numericC2 = constToNumber(c2Coef, c2Exp);
          decimalsAreFallback = false;
          lines.push("Differentiate y = e^(\u03B1x) (" + C1 + " cos(\u03B2x) + " + C2 + " sin(\u03B2x)).");
          lines.push("At x = 0 the exponential is 1, cos(0) = 1, and sin(0) = 0.");
          lines.push("y(0) = " + C1 + ".");
          lines.push("y'(0) = \u03B1 " + C1 + " + \u03B2 " + C2 + ".");
          lines.push("");
          lines.push(C1 + " = " + c1text + ".");
          lines.push(C2 + " = (y'\u2080 \u2212 \u03B1 y\u2080) / \u03B2 = (" + fmtRat(sub(v0, mul(alpha, y0))) + ") / (" + fmtSurd(beta) + ") = " + c2text + ".");
        } else {
          var decay = Math.exp(-alphaN * x0n);
          var cs = Math.cos(betaN * x0n);
          var sn = Math.sin(betaN * x0n);
          var A = y0n * decay;
          var B = (v0n - alphaN * y0n) * decay / betaN;
          numericC1 = A * cs - B * sn;
          numericC2 = A * sn + B * cs;
          decimalsAreFallback = true;
          var expShift = ratSurd(neg(mul(alpha, x0)));
          var bCoef = divSurd(ratSurd(sub(v0, mul(alpha, y0))), beta);
          lines.push("Differentiate y = e^(\u03B1x) (" + C1 + " cos(\u03B2x) + " + C2 + " sin(\u03B2x)).");
          lines.push("Let E = e^(\u03B1 x\u2080), using \u03B1 = " + fmtRat(alpha) + " and x\u2080 = " + fmtRat(x0) + ".");
          lines.push("The conditions become the 2 by 2 system");
          lines.push("E (" + C1 + " cos(\u03B2 x\u2080) + " + C2 + " sin(\u03B2 x\u2080)) = y\u2080.");
          lines.push("\u03B1 y\u2080 + E \u03B2 (\u2212" + C1 + " sin(\u03B2 x\u2080) + " + C2 + " cos(\u03B2 x\u2080)) = y'\u2080.");
          lines.push("");
          lines.push("Solve for the combinations that multiply the sine and the cosine.");
          lines.push("A = y\u2080 e^(\u2212\u03B1 x\u2080) = " + fmtConst(ratSurd(y0), expShift) + ".");
          lines.push("B = (y'\u2080 \u2212 \u03B1 y\u2080) e^(\u2212\u03B1 x\u2080) / \u03B2 = " + fmtConst(bCoef, expShift) + ".");
          lines.push(C1 + " = A cos(\u03B2 x\u2080) \u2212 B sin(\u03B2 x\u2080).");
          lines.push(C2 + " = A sin(\u03B2 x\u2080) + B cos(\u03B2 x\u2080).");
          lines.push("\u03B2 x\u2080 = " + fmtSurd(mulSurd(beta, ratSurd(x0))) + ". Sine and cosine of that angle are not simplified to fractions here.");
          lines.push("The constants below are a decimal approximation of that exact system. They are not exact fractions.");
          c1text = fmtDecimal(numericC1);
          c2text = fmtDecimal(numericC2);
        }
      }

      if (caseName === "complex" && !isZero(x0)) {
        particular = generalComplex(alpha, beta).replace(C1, "(" + c1text + ")").replace(C2, "(" + c2text + ")").replace("y = ", "y \u2248 ");
        lines.push("");
        lines.push("Decimal approximation");
        lines.push(C1 + " \u2248 " + c1text + ".");
        lines.push(C2 + " \u2248 " + c2text + ".");
        lines.push("These decimals are labelled approximations. The exact constants still contain e^(\u2212\u03B1 x\u2080), cos(\u03B2 x\u2080), and sin(\u03B2 x\u2080).");
      } else {
        if (caseName === "distinct") particular = particularDistinct(c1text, c2text, r1, r2);
        else if (caseName === "repeated") particular = particularRepeated(c1text, c2text, r);
        else particular = particularComplex(c1text, c2text, alpha, beta);
        lines.push("");
        lines.push("Particular solution");
        lines.push(particular + ".");
        if (decimalsAreFallback) {
          lines.push("");
          lines.push("Decimal approximation");
          lines.push(C1 + " \u2248 " + fmtDecimal(numericC1) + ".");
          lines.push(C2 + " \u2248 " + fmtDecimal(numericC2) + ".");
          lines.push("The expressions above are exact. The decimals are only a labelled approximation of those exponentials.");
        } else if (c1text.indexOf(SQRT) >= 0 || c2text.indexOf(SQRT) >= 0) {
          lines.push("");
          lines.push("Decimal approximation, for a calculator check");
          lines.push(C1 + " \u2248 " + fmtDecimal(numericC1) + ".");
          lines.push(C2 + " \u2248 " + fmtDecimal(numericC2) + ".");
          lines.push("The fractions and square roots above are the exact constants. The decimals are rounded.");
        }
      }
    }

    var realPartNote = dampingSentence(a, b, c, caseName, r1, r2, r, alpha);
    if (realPartNote) {
      lines.push("");
      lines.push(realPartNote);
    }

    lines.push("");
    lines.push("Check");
    if (caseName === "distinct") {
      lines.push("Each root returns zero in a r\u00B2 + b r + c. At r" + SUB1 + " = " + fmtSurd(r1) + " and at r" + SUB2 + " = " + fmtSurd(r2) + ", the characteristic polynomial is 0.");
    } else if (caseName === "repeated") {
      lines.push("The repeated root returns zero in a r\u00B2 + b r + c. At r = " + fmtSurd(r) + ", the characteristic polynomial is 0.");
    } else {
      lines.push("The pair \u03B1 \u00B1 \u03B2 i returns zero in a r\u00B2 + b r + c. The real part of that substitution is 0, and the imaginary part is 0 because \u03B1 = \u2212b / (2a).");
    }

    var numeric = {
      caseName: caseName,
      r1: r1 ? surdToNumber(r1) : null,
      r2: r2 ? surdToNumber(r2) : null,
      r: r ? surdToNumber(r) : null,
      alpha: alpha ? ratToNumber(alpha) : null,
      beta: beta ? surdToNumber(beta) : null,
      c1: numericC1,
      c2: numericC2,
      x0: ratToNumber(x0),
      y0: hasIC ? ratToNumber(y0) : null,
      v0: hasIC ? ratToNumber(v0) : null,
      hasIC: hasIC
    };

    if (hasIC) {
      var yBack = evalY(numeric, numeric.x0);
      var ypBack = evalYp(numeric, numeric.x0);
      var scale = Math.max(1, Math.abs(numeric.y0), Math.abs(numeric.v0));
      var yOk = Math.abs(yBack - numeric.y0) <= 1e-6 * scale;
      var vOk = Math.abs(ypBack - numeric.v0) <= 1e-6 * scale;
      if (!yOk || !vOk) {
        lines.push("The decimal evaluation of the initial conditions did not match closely. Treat the decimal constants as unreliable for these coefficients, and use the exact expressions.");
        numeric.checkOk = false;
      } else {
        numeric.checkOk = true;
        if (decimalsAreFallback) {
          lines.push("Substituting the decimal constants back into y and y' reproduces the initial conditions to the printed rounding.");
        } else {
          lines.push("With these constants, y(" + fmtRat(x0) + ") = " + fmtRat(y0) + " and y'(" + fmtRat(x0) + ") = " + fmtRat(v0) + ".");
        }
      }
    } else {
      numeric.checkOk = true;
    }

    var amount = particular || general;
    return {
      a: a,
      b: b,
      c: c,
      discriminant: disc,
      caseName: caseName,
      r1: r1,
      r2: r2,
      r: r,
      alpha: alpha ? ratSurd(alpha) : null,
      beta: beta,
      general: general,
      particular: particular,
      amount: amount,
      c1: c1text,
      c2: c2text,
      c1Coef: c1Coef,
      c1Exp: c1Exp,
      c2Coef: c2Coef,
      c2Exp: c2Exp,
      hasIC: hasIC,
      decimalsAreFallback: decimalsAreFallback,
      lines: lines,
      text: lines.join("\n"),
      numeric: numeric,
      equation: fmtODE(a, b, c)
    };
  }

  function dampingSentence(a, b, c, caseName, r1, r2, r, alpha) {
    var same = (a.n > 0n && b.n > 0n && c.n > 0n) || (a.n < 0n && b.n < 0n && c.n < 0n);
    if (same) {
      if (caseName === "distinct") {
        return "The three coefficients have the same sign, so both real roots are negative. On a spring, that is overdamped motion: the mass returns toward equilibrium as a sum of decaying exponentials and does not oscillate.";
      }
      if (caseName === "repeated") {
        return "The three coefficients have the same sign, so the repeated root is negative. On a spring, that is critical damping: the mass returns toward equilibrium without oscillating, and one term carries an extra factor of x.";
      }
      return "The three coefficients have the same sign, so the real part \u03B1 is negative. On a spring, that is underdamped motion: the mass oscillates, and the oscillations shrink inside a decaying exponential.";
    }
    if (isZero(b) && a.n !== 0n && c.n !== 0n && ((a.n > 0n && c.n > 0n) || (a.n < 0n && c.n < 0n))) {
      return "There is no y' term, and a and c have the same sign. The motion oscillates at a constant amplitude. Nothing in the equation drains energy.";
    }
    if (caseName === "distinct") {
      var s1 = signSurd(r1);
      var s2 = signSurd(r2);
      if (s1 > 0 && s2 > 0) return "Both real roots are positive, so a typical solution grows as x increases.";
      if (s1 > 0 && s2 < 0) return "The real roots have opposite signs, so one exponential grows and the other decays.";
      if (s1 < 0 && s2 < 0) return "Both real roots are negative, so both exponentials decay as x increases.";
    } else if (caseName === "repeated" && r) {
      if (signSurd(r) > 0) return "The repeated root is positive, so solutions grow as x increases.";
      if (signSurd(r) < 0) return "The repeated root is negative, so solutions decay as x increases, with a possible extra factor of x.";
    } else if (alpha) {
      if (alpha.n > 0n) return "The real part \u03B1 is positive, so the oscillations grow as x increases.";
      if (alpha.n < 0n) return "The real part \u03B1 is negative, so the oscillations shrink as x increases.";
      return "The real part \u03B1 is zero, so the oscillations keep a constant amplitude.";
    }
    return "";
  }

  function verifyNumeric(solved, sampleX) {
    var numeric = solved.numeric;
    var a = ratToNumber(solved.a);
    var b = ratToNumber(solved.b);
    var c = ratToNumber(solved.c);
    var xs = sampleX || [0, 0.3, -0.4, 1.2];
    var worst = 0;
    for (var i = 0; i < xs.length; i++) {
      var x = xs[i];
      var y = evalY(numeric, x);
      var yp = evalYp(numeric, x);
      var ypp;
      if (numeric.caseName === "distinct") {
        ypp = numeric.c1 * numeric.r1 * numeric.r1 * Math.exp(numeric.r1 * x) + numeric.c2 * numeric.r2 * numeric.r2 * Math.exp(numeric.r2 * x);
      } else if (numeric.caseName === "repeated") {
        var rr = numeric.r;
        ypp = (2 * rr * numeric.c2 + rr * rr * (numeric.c1 + numeric.c2 * x)) * Math.exp(rr * x);
      } else {
        var ypOsc = -numeric.c1 * numeric.beta * Math.sin(numeric.beta * x) + numeric.c2 * numeric.beta * Math.cos(numeric.beta * x);
        var yppOsc = -numeric.c1 * numeric.beta * numeric.beta * Math.cos(numeric.beta * x) - numeric.c2 * numeric.beta * numeric.beta * Math.sin(numeric.beta * x);
        ypp = numeric.alpha * yp + numeric.alpha * Math.exp(numeric.alpha * x) * ypOsc + Math.exp(numeric.alpha * x) * yppOsc;
      }
      if (!isFinite(y) || !isFinite(yp) || !isFinite(ypp)) return { ok: false, reason: "non-finite at x = " + x };
      var residual = a * ypp + b * yp + c * y;
      var scale = Math.max(1, Math.abs(a * ypp), Math.abs(b * yp), Math.abs(c * y));
      worst = Math.max(worst, Math.abs(residual) / scale);
    }
    if (numeric.hasIC) {
      var yIc = evalY(numeric, numeric.x0);
      var ypIc = evalYp(numeric, numeric.x0);
      var scaleIc = Math.max(1, Math.abs(numeric.y0), Math.abs(numeric.v0));
      worst = Math.max(worst, Math.abs(yIc - numeric.y0) / scaleIc, Math.abs(ypIc - numeric.v0) / scaleIc);
    }
    return { ok: worst < 1e-6, worst: worst };
  }

  function chooseWindow(numeric) {
    var center = numeric.hasIC ? numeric.x0 : 0;
    var half = 4;
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
      if (!(maxAbs < 40)) half *= 0.5;
      else half *= 1.4;
      if (half < 0.15) break;
    }
    return { center: center, half: Math.max(half, 0.25) };
  }

  function drawPlot(solved) {
    var canvas = document.getElementById("ode-plot");
    var legend = document.getElementById("ode-legend");
    if (!canvas || !canvas.getContext) return;
    var numeric = solved.numeric;
    var window = chooseWindow(numeric);
    var xMin = window.center - window.half;
    var xMax = window.center + window.half;
    var n = 240;
    var pts = [];
    var i;
    var yLo = Infinity;
    var yHi = -Infinity;
    for (i = 0; i <= n; i++) {
      var x = xMin + (xMax - xMin) * i / n;
      var y = evalY(numeric, x);
      pts.push({ x: x, y: y });
      if (isFinite(y)) {
        if (y < yLo) yLo = y;
        if (y > yHi) yHi = y;
      }
    }
    if (!isFinite(yLo) || !isFinite(yHi) || yHi === yLo) {
      yLo = -1;
      yHi = 1;
    }
    var rawSpan = yHi - yLo;
    var cap = Math.max(8, 6 * Math.max(Math.abs(numeric.c1), Math.abs(numeric.c2), 1));
    if (rawSpan > cap * 4) {
      var mid = numeric.hasIC && isFinite(numeric.y0) ? numeric.y0 : 0;
      yLo = mid - cap;
      yHi = mid + cap;
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
    for (i = 0; i < pts.length; i++) {
      var py = pts[i].y;
      if (!isFinite(py) || py < yLo || py > yHi) {
        pen = false;
        continue;
      }
      var px = xPix(pts[i].x);
      var yy = yPix(py);
      if (!pen) {
        ctx.moveTo(px, yy);
        pen = true;
      } else ctx.lineTo(px, yy);
    }
    ctx.stroke();

    if (numeric.hasIC && isFinite(numeric.y0)) {
      ctx.beginPath();
      ctx.fillStyle = "#8b5a2b";
      ctx.arc(xPix(numeric.x0), yPix(numeric.y0), 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#4a5160";
    ctx.font = "12px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(fmtDecimal(xMin), padL, padT + plotH + 6);
    ctx.fillText(fmtDecimal(xMax), padL + plotW, padT + plotH + 6);
    ctx.fillText("x", padL + plotW / 2, padT + plotH + 6);

    var summary = numeric.hasIC
      ? "Plot of the particular solution from x = " + fmtDecimal(xMin) + " to x = " + fmtDecimal(xMax) + ". The marked point is the initial condition."
      : "Plot of one sample solution, with C1 = 1 and C2 = 1, from x = " + fmtDecimal(xMin) + " to x = " + fmtDecimal(xMax) + ".";
    canvas.setAttribute("aria-label", summary);
    if (legend) legend.textContent = summary;
  }

  function showError(message) {
    var error = document.getElementById("ode-error");
    var result = document.getElementById("ode-result");
    if (error) {
      error.textContent = message;
      error.classList.add("visible");
    }
    if (result) result.classList.remove("visible");
  }

  function render(solved) {
    var error = document.getElementById("ode-error");
    var result = document.getElementById("ode-result");
    var amount = document.getElementById("ode-amount");
    var detail = document.getElementById("ode-detail");
    if (error) {
      error.textContent = "";
      error.classList.remove("visible");
    }
    if (amount) amount.textContent = solved.amount;
    if (detail) detail.textContent = solved.text;
    if (result) result.classList.add("visible");
    drawPlot(solved);
  }

  function readForm() {
    return {
      a: document.getElementById("ode-a").value,
      b: document.getElementById("ode-b").value,
      c: document.getElementById("ode-c").value,
      x0: document.getElementById("ode-x0").value,
      y0: document.getElementById("ode-y0").value,
      v0: document.getElementById("ode-v0").value
    };
  }

  function fill(values) {
    document.getElementById("ode-a").value = values.a;
    document.getElementById("ode-b").value = values.b;
    document.getElementById("ode-c").value = values.c;
    document.getElementById("ode-x0").value = values.x0;
    document.getElementById("ode-y0").value = values.y0;
    document.getElementById("ode-v0").value = values.v0;
  }

  var PRESETS = [
    { id: "ode-preset-distinct", a: "1", b: "\u22123", c: "2", x0: "", y0: "", v0: "" },
    { id: "ode-preset-repeated", a: "1", b: "4", c: "4", x0: "", y0: "", v0: "" },
    { id: "ode-preset-complex", a: "1", b: "2", c: "5", x0: "0", y0: "1", v0: "0" },
    { id: "ode-preset-spring", a: "1", b: "3", c: "2", x0: "0", y0: "1", v0: "0" }
  ];

  function boot() {
    var form = document.getElementById("ode-form");
    if (!form) return;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      try {
        render(solve(readForm()));
      } catch (err) {
        showError(err && err.message ? err.message : "The equation could not be solved.");
      }
    });
    var reset = document.getElementById("ode-reset");
    if (reset) {
      reset.addEventListener("click", function () {
        fill(PRESETS[2]);
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
      var result = document.getElementById("ode-result");
      if (!result || !result.classList.contains("visible")) return;
      try { drawPlot(solve(readForm())); } catch (err) { /* keep the last good plot */ }
    });
    try { render(solve(readForm())); } catch (err) { showError(err.message); }
  }

  return {
    PRESETS: PRESETS,
    parseEntry: parseEntry,
    fmtRat: fmtRat,
    fmtSurd: fmtSurd,
    solve: solve,
    verifyNumeric: verifyNumeric,
    evalY: evalY,
    evalYp: evalYp,
    boot: boot,
    MINUS: MINUS,
    SQRT: SQRT
  };
});
