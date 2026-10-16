/* Hand checks for a y'' + b y' + c y = 0.
 *
 * Preset 1. y'' - 3y' + 2y = 0.
 *   Δ = 9 - 8 = 1. Roots (3 ± 1)/2, so 2 and 1.
 *   y = C1 e^(2x) + C2 e^x.
 *
 * Preset 2. y'' + 4y' + 4y = 0.
 *   Δ = 16 - 16 = 0. Repeated root r = -2.
 *   y = (C1 + C2 x) e^(-2x).
 *
 * Preset 3. y'' + 2y' + 5y = 0, y(0) = 1, y'(0) = 0.
 *   Δ = 4 - 20 = -16. α = -1, β = 2.
 *   C1 = 1, C2 = (0 - (-1)(1))/2 = 1/2.
 *   y = e^(-x) (cos(2x) + (1/2) sin(2x)).
 *
 * Preset 4. Overdamped spring y'' + 3y' + 2y = 0, y(0) = 1, y'(0) = 0.
 *   Δ = 9 - 8 = 1. Roots -1 and -2.
 *   C1 + C2 = 1, -C1 - 2 C2 = 0, so C1 = 2 and C2 = -1.
 *   y = 2 e^(-x) - e^(-2x).
 *
 * Also checked by hand:
 *   y'' - y' - y = 0, y(0) = 1, y'(0) = 0.
 *   Roots (1 ± √5)/2. C1 = (5 - √5)/10, C2 = (5 + √5)/10.
 *   y'' - 3y' + 2y = 0, y(1) = 3, y'(1) = 1.
 *   C1 = -2 e^(-2), C2 = 5 e^(-1).
 *   y'' + 4y' + 4y = 0, y(1) = 1, y'(1) = 0.
 *   C1 = -e^(2), C2 = 2 e^(2).
 */
"use strict";

var m = require("../js/second-order-ode.js");
var failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL " + msg);
  } else {
    console.log("ok " + msg);
  }
}

function S(input) {
  return m.solve(input);
}

var distinct = S({ a: "1", b: "-3", c: "2" });
assert(distinct.caseName === "distinct", "preset distinct case");
assert(m.fmtSurd(distinct.r1) === "2", "preset distinct larger root " + m.fmtSurd(distinct.r1));
assert(m.fmtSurd(distinct.r2) === "1", "preset distinct smaller root " + m.fmtSurd(distinct.r2));
assert(distinct.general.indexOf("e^(2x)") >= 0, "preset distinct general has e^(2x)");
assert(distinct.general.indexOf("e^x") >= 0, "preset distinct general has e^x");
assert(m.fmtRat(distinct.discriminant) === "1", "preset distinct discriminant");
assert(m.verifyNumeric(distinct).ok, "preset distinct satisfies the ODE " + JSON.stringify(m.verifyNumeric(distinct)));

var repeated = S({ a: "1", b: "4", c: "4" });
assert(repeated.caseName === "repeated", "preset repeated case");
assert(m.fmtSurd(repeated.r) === m.MINUS + "2", "preset repeated root " + m.fmtSurd(repeated.r));
assert(repeated.general.indexOf("x") >= 0, "preset repeated has the x factor");
assert(m.verifyNumeric(repeated).ok, "preset repeated satisfies the ODE");

var complex = S({ a: "1", b: "2", c: "5", x0: "0", y0: "1", v0: "0" });
assert(complex.caseName === "complex", "preset complex case");
assert(m.fmtSurd(complex.alpha) === m.MINUS + "1", "preset alpha " + m.fmtSurd(complex.alpha));
assert(m.fmtSurd(complex.beta) === "2", "preset beta " + m.fmtSurd(complex.beta));
assert(complex.c1 === "1", "preset C1 " + complex.c1);
assert(complex.c2 === "1/2", "preset C2 " + complex.c2);
assert(complex.particular.indexOf("cos(2x)") >= 0, "preset particular has cos(2x): " + complex.particular);
assert(complex.particular.indexOf("sin(2x)") >= 0, "preset particular has sin(2x)");
assert(complex.decimalsAreFallback === false, "preset complex constants are exact");
assert(m.verifyNumeric(complex).ok, "preset complex satisfies the ODE and ICs");
assert(Math.abs(m.evalY(complex.numeric, 0) - 1) < 1e-9, "preset y(0)");
assert(Math.abs(m.evalYp(complex.numeric, 0)) < 1e-9, "preset y'(0)");

var spring = S({ a: "1", b: "3", c: "2", x0: "0", y0: "1", v0: "0" });
assert(spring.caseName === "distinct", "spring case");
assert(m.fmtSurd(spring.r1) === m.MINUS + "1", "spring root -1 " + m.fmtSurd(spring.r1));
assert(m.fmtSurd(spring.r2) === m.MINUS + "2", "spring root -2 " + m.fmtSurd(spring.r2));
assert(spring.c1 === "2", "spring C1 " + spring.c1);
assert(spring.c2 === m.MINUS + "1", "spring C2 " + spring.c2);
assert(spring.amount.indexOf("2 e^(" + m.MINUS + "x)") >= 0 || spring.amount.indexOf("2 e^(" + m.MINUS + "x)") === 0 || spring.particular.indexOf("2 e^") >= 0, "spring particular " + spring.particular);
assert(m.verifyNumeric(spring).ok, "spring satisfies the ODE and ICs");
assert(Math.abs(m.evalY(spring.numeric, 0) - 1) < 1e-9, "spring y(0)");
assert(Math.abs(m.evalYp(spring.numeric, 0)) < 1e-9, "spring y'(0)");

var golden = S({ a: "1", b: "-1", c: "-1", x0: "0", y0: "1", v0: "0" });
assert(m.fmtSurd(golden.r1) === "(1 + " + m.SQRT + "5)/2", "golden r1 " + m.fmtSurd(golden.r1));
assert(m.fmtSurd(golden.r2) === "(1 " + m.MINUS + " " + m.SQRT + "5)/2", "golden r2 " + m.fmtSurd(golden.r2));
assert(golden.c1 === "(5 " + m.MINUS + " " + m.SQRT + "5)/10", "golden C1 " + golden.c1);
assert(golden.c2 === "(5 + " + m.SQRT + "5)/10", "golden C2 " + golden.c2);
assert(m.verifyNumeric(golden).ok, "golden satisfies the ODE and ICs");

var shifted = S({ a: "1", b: "-3", c: "2", x0: "1", y0: "3", v0: "1" });
assert(shifted.c1 === m.MINUS + "2 e^(" + m.MINUS + "2)", "shifted C1 " + shifted.c1);
assert(shifted.c2 === "5 e^(" + m.MINUS + "1)", "shifted C2 " + shifted.c2);
assert(shifted.decimalsAreFallback === true, "shifted constants labelled as having a decimal too");
assert(m.verifyNumeric(shifted).ok, "shifted satisfies the ODE and ICs " + JSON.stringify(m.verifyNumeric(shifted)));

var repIc = S({ a: "1", b: "4", c: "4", x0: "1", y0: "1", v0: "0" });
assert(repIc.c1 === m.MINUS + "e^(2)", "repeated nonzero C1 " + repIc.c1);
assert(repIc.c2 === "2 e^(2)", "repeated nonzero C2 " + repIc.c2);
assert(m.verifyNumeric(repIc).ok, "repeated nonzero IC");

var frac = S({ a: "1/2", b: "1", c: "1/2" });
assert(frac.caseName === "repeated", "fraction coefficients repeated");
assert(m.fmtSurd(frac.r) === m.MINUS + "1", "fraction root " + m.fmtSurd(frac.r));

var decimal = S({ a: "1", b: "-0.5", c: "-0.5" });
assert(m.fmtSurd(decimal.r1) === "1", "decimal root 1 " + m.fmtSurd(decimal.r1));
assert(m.fmtSurd(decimal.r2) === m.MINUS + "1/2", "decimal root -1/2 " + m.fmtSurd(decimal.r2));

var negativeA = S({ a: "-1", b: "-2", c: "-5", x0: "0", y0: "1", v0: "0" });
assert(negativeA.caseName === "complex", "negative leading coefficient");
assert(m.fmtSurd(negativeA.alpha) === m.MINUS + "1", "negative a alpha");
assert(m.fmtSurd(negativeA.beta) === "2", "negative a beta " + m.fmtSurd(negativeA.beta));
assert(negativeA.c2 === "1/2", "negative a C2 " + negativeA.c2);

var pureOsc = S({ a: "1", b: "0", c: "1", x0: "0", y0: "1", v0: "0" });
assert(pureOsc.caseName === "complex", "y'' + y = 0");
assert(pureOsc.c1 === "1" && pureOsc.c2 === "0", "cosine solution constants " + pureOsc.c1 + ", " + pureOsc.c2);
assert(pureOsc.particular.indexOf("cos x") >= 0, "particular is cos x: " + pureOsc.particular);
assert(m.verifyNumeric(pureOsc).ok, "cosine satisfies the ODE");

var critIc = S({ a: "1", b: "4", c: "4", x0: "0", y0: "1", v0: "0" });
assert(critIc.c1 === "1", "critical C1");
assert(critIc.c2 === "2", "critical C2 " + critIc.c2);
assert(m.verifyNumeric(critIc).ok, "critical IC");

var unicode = S({ a: "1", b: "\u22123", c: "2" });
assert(m.fmtSurd(unicode.r1) === "2", "unicode minus parses");

var halfSqrt = S({ a: "1", b: "1", c: "1" });
assert(halfSqrt.caseName === "complex", "y'' + y' + y");
assert(m.fmtSurd(halfSqrt.alpha) === m.MINUS + "1/2", "alpha -1/2 " + m.fmtSurd(halfSqrt.alpha));
assert(m.fmtSurd(halfSqrt.beta) === "(" + m.SQRT + "3)/2", "beta √3/2 " + m.fmtSurd(halfSqrt.beta));
assert(m.verifyNumeric(halfSqrt).ok, "underdamped unit coefficients");

assert((function () {
  try { S({ a: "0", b: "1", c: "1" }); return false; } catch (e) { return /nonzero/.test(e.message); }
})(), "a = 0 is refused");

assert((function () {
  try { S({ a: "1", b: "1", c: "1", x0: "0", y0: "", v0: "1" }); return false; } catch (e) { return /triple/.test(e.message); }
})(), "partial initial conditions are refused");

assert((function () {
  try { S({ a: "1/0", b: "1", c: "1" }); return false; } catch (e) { return /denominator/.test(e.message); }
})(), "zero denominator is refused");

var complexShift = S({ a: "1", b: "2", c: "5", x0: "1", y0: "1", v0: "0" });
assert(complexShift.amount.indexOf("y = y") === -1, "decimal solution is not doubled " + complexShift.amount);
assert(complexShift.amount.indexOf("y \u2248") === 0, "decimal solution is labelled with an approximation sign");
assert(complexShift.decimalsAreFallback === true, "complex nonzero time uses decimals");
assert(complexShift.text.indexOf("Decimal approximation") >= 0, "decimal label is present");
assert(complexShift.text.indexOf("not exact fractions") >= 0, "decimals are called out");
assert(m.verifyNumeric(complexShift).ok, "complex shifted IC " + JSON.stringify(m.verifyNumeric(complexShift)));

m.PRESETS.forEach(function (preset) {
  var solved = S(preset);
  var check = m.verifyNumeric(solved);
  assert(check.ok, "preset " + preset.id + " numeric check " + JSON.stringify(check));
  assert(solved.text.indexOf("Characteristic equation") >= 0, preset.id + " shows the characteristic equation");
  assert(solved.text.indexOf("Discriminant") >= 0, preset.id + " shows the discriminant");
});

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("all checks passed");
