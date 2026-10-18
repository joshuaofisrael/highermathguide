/* Hand checks for Taylor and Maclaurin polynomials.
 *
 * e^x about 0, degree 4:
 *   1 + x + x^2/2 + x^3/6 + x^4/24.
 *   P(1/2) = 211/128.
 *
 * e^x about 1, degree 3:
 *   e + e(x-1) + e(x-1)^2/2 + e(x-1)^3/6.
 *
 * sin x about 0, degree 5: x - x^3/6 + x^5/120.
 * cos x about 0, degree 4: 1 - x^2/2 + x^4/24.
 * sin(2x) about 0, degree 3: 2x - (4/3) x^3.
 * cos(3x) about 0, degree 4: 1 - (9/2) x^2 + (27/8) x^4.
 * ln(1+x) about 0, degree 4: x - x^2/2 + x^3/3 - x^4/4.
 * ln(1+x) about 1, degree 2: ln 2 + (1/2)(x-1) - (1/8)(x-1)^2.
 * ln x about 1, degree 3: (x-1) - (x-1)^2/2 + (x-1)^3/3.
 * 1/(1-x) about 0, degree 4: 1 + x + x^2 + x^3 + x^4.
 * 1/(1-x) about 2, degree 2: -1 + (x-2) - (x-2)^2.
 * arctan x about 0, degree 7: x - x^3/3 + x^5/5 - x^7/7.
 * arctan x about 1, degree 2: pi/4 + (1/2)(x-1) - (1/4)(x-1)^2.
 * sqrt(1+x) about 0, degree 4: 1 + x/2 - x^2/8 + x^3/16 - 5 x^4/128.
 * sqrt(1+x) about 3, degree 3: 2 + (1/4)(x-3) - (1/64)(x-3)^2 + (1/512)(x-3)^3.
 * (1+x)^3 about 2, degree 3: 27 + 27(x-2) + 9(x-2)^2 + (x-2)^3, remainder 0.
 * (1+x)^(1/3) about 0, degree 2: 1 + x/3 - x^2/9.
 * sin x about pi/2, degree 2: 1 - (1/2)(x-pi/2)^2.
 * sin x about pi/4, degree 2: (√2/2) + (√2/2)(x-pi/4) - (√2/4)(x-pi/4)^2.
 * sin(pi/12) = (√6 - √2)/4.
 * cos x about pi, degree 2: -1 + (1/2)(x-pi)^2.
 */
"use strict";

var m = require("../js/taylor-polynomial.js");
var failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL " + msg);
  } else {
    console.log("ok " + msg);
  }
}

function solve(input) {
  return m.solve(input);
}

function poly(input) {
  return solve(input).polynomial;
}

function coef(input, k) {
  return solve(input).rows[k].coefShort;
}

function throws(input) {
  try {
    solve(input);
    return false;
  } catch (err) {
    return true;
  }
}

function lastNumber(text) {
  var matches = text.match(/\d+\.\d+(?:e[+-]?\d+)?|\d+e[+-]\d+/g);
  if (!matches) return null;
  return parseFloat(matches[matches.length - 1]);
}

function errorOf(solved) {
  var line = solved.checkLines.filter(function (item) {
    return item.indexOf("Absolute error") !== -1;
  })[0];
  if (!line) return null;
  var matches = line.match(/\d+\.\d+(?:e[+-]?\d+)?|\d+e[+-]\d+/g);
  if (!matches) return 0;
  return parseFloat(matches[matches.length - 1]);
}

assert(poly({ fn: "exp", center: "0", order: "4", x: "1/2" }) === "1 + x + (1/2) x^2 + (1/6) x^3 + (1/24) x^4", "e^x Maclaurin degree 4");
assert(coef({ fn: "exp", center: "0", order: "5", x: "0" }, 5) === "1/120", "e^x coefficient 1/5!");

var expHalf = solve({ fn: "exp", center: "0", order: "4", x: "1/2" });
assert(expHalf.checkLines[0].indexOf("211/128") !== -1, "P4(1/2) = 211/128");
assert(expHalf.title.indexOf("Maclaurin") !== -1, "center 0 is labeled Maclaurin");

var expShift = solve({ fn: "exp", center: "1", order: "3", x: "1" });
assert(expShift.polynomial === "e + e (x \u2212 1) + (e/2) (x \u2212 1)^2 + (e/6) (x \u2212 1)^3", "e^x about 1, degree 3");
assert(expShift.title.indexOf("Taylor") !== -1, "nonzero center is labeled Taylor");
assert(expShift.remainder.indexOf("remainder is 0") !== -1, "check at the center has remainder 0");

assert(poly({ fn: "sin", center: "0", order: "5", x: "0.3" }) === "x \u2212 (1/6) x^3 + (1/120) x^5", "sin Maclaurin degree 5");
assert(poly({ fn: "cos", center: "0", order: "4", x: "0.2" }) === "1 \u2212 (1/2) x^2 + (1/24) x^4", "cos Maclaurin degree 4");
assert(poly({ fn: "sin_c", param: "2", center: "0", order: "3", x: "0.1" }) === "2 x \u2212 (4/3) x^3", "sin(2x) degree 3");
assert(poly({ fn: "cos_c", param: "3", center: "0", order: "4", x: "0.1" }) === "1 \u2212 (9/2) x^2 + (27/8) x^4", "cos(3x) degree 4");
assert(poly({ fn: "exp_c", param: "2", center: "0", order: "3", x: "0.2" }) === "1 + 2 x + 2 x^2 + (4/3) x^3", "e^(2x) degree 3");

assert(poly({ fn: "ln1p", center: "0", order: "4", x: "1/2" }) === "x \u2212 (1/2) x^2 + (1/3) x^3 \u2212 (1/4) x^4", "ln(1+x) degree 4");
var lnShift = poly({ fn: "ln1p", center: "1", order: "2", x: "1.2" });
assert(lnShift.indexOf("ln(2)") === 0 && lnShift.indexOf("(1/2)") !== -1 && lnShift.indexOf("\u2212 (1/8)") !== -1, "ln(1+x) about 1");
assert(poly({ fn: "ln", center: "1", order: "3", x: "1.1" }) === "(x \u2212 1) \u2212 (1/2) (x \u2212 1)^2 + (1/3) (x \u2212 1)^3", "ln x about 1");

assert(poly({ fn: "geom", center: "0", order: "4", x: "1/2" }) === "1 + x + x^2 + x^3 + x^4", "geometric Maclaurin");
assert(poly({ fn: "geom", center: "2", order: "2", x: "2.2" }) === "\u22121 + (x \u2212 2) \u2212 (x \u2212 2)^2", "1/(1-x) about 2");

assert(poly({ fn: "atan", center: "0", order: "7", x: "0.2" }) === "x \u2212 (1/3) x^3 + (1/5) x^5 \u2212 (1/7) x^7", "arctan Maclaurin degree 7");
var atan1 = poly({ fn: "atan", center: "1", order: "2", x: "1.1" });
assert(atan1.indexOf("\u03C0/4") === 1 && atan1.indexOf("(1/2)") !== -1 && atan1.indexOf("\u2212 (1/4)") !== -1, "arctan about 1");

assert(poly({ fn: "sqrt1p", center: "0", order: "4", x: "0.1" }) === "1 + (1/2) x \u2212 (1/8) x^2 + (1/16) x^3 \u2212 (5/128) x^4", "sqrt(1+x) degree 4");
assert(poly({ fn: "sqrt1p", center: "3", order: "3", x: "3.2" }) === "2 + (1/4) (x \u2212 3) \u2212 (1/64) (x \u2212 3)^2 + (1/512) (x \u2212 3)^3", "sqrt(1+x) about 3");
assert(poly({ fn: "binom", param: "1/3", center: "0", order: "2", x: "0.1" }) === "1 + (1/3) x \u2212 (1/9) x^2", "(1+x)^(1/3) degree 2");
assert(poly({ fn: "binom", param: "3", center: "2", order: "4", x: "2.1" }) === "27 + 27 (x \u2212 2) + 9 (x \u2212 2)^2 + (x \u2212 2)^3", "(1+x)^3 about 2 is exact by degree 3");
var cube = solve({ fn: "binom", param: "3", center: "2", order: "4", x: "2.1" });
assert(cube.remainder.indexOf("remainder is 0") !== -1, "polynomial remainder is 0 past its degree");
assert(cube.checkLines.join(" ").indexOf("\u2248 0") !== -1 || cube.checkLines.join(" ").indexOf(" 0.") !== -1, "exact polynomial error is 0");

assert(poly({ fn: "sin", center: "pi/2", order: "2", x: "1.6" }) === "1 \u2212 (1/2) (x \u2212 \u03C0/2)^2", "sin about pi/2");
assert(poly({ fn: "sin", center: "pi/4", order: "2", x: "0.8" }) === "\u221A2/2 + (\u221A2/2) (x \u2212 \u03C0/4) \u2212 (\u221A2/4) (x \u2212 \u03C0/4)^2", "sin about pi/4");
assert(poly({ fn: "sin", center: "pi/12", order: "0", x: "0.2" }) === "(\u221A6 \u2212 \u221A2)/4", "sin(pi/12)");
assert(poly({ fn: "cos", center: "pi", order: "2", x: "3" }) === "\u22121 + (1/2) (x \u2212 \u03C0)^2", "cos about pi");
assert(poly({ fn: "exp", center: "-1", order: "2", x: "-0.5" }).indexOf("(x + 1)") !== -1, "negative center prints x + 1");

assert(throws({ fn: "ln1p", center: "-1", order: "2", x: "0" }), "ln(1+x) rejects a = -1");
assert(throws({ fn: "ln", center: "0", order: "2", x: "1" }), "ln x rejects a = 0");
assert(throws({ fn: "geom", center: "1", order: "2", x: "0" }), "1/(1-x) rejects a = 1");
assert(throws({ fn: "sqrt1p", center: "-2", order: "2", x: "0" }), "sqrt rejects a center below -1");
assert(throws({ fn: "exp", center: "0", order: "13", x: "0" }), "order above 12 is rejected");
assert(throws({ fn: "sin", center: "pi/7", order: "1", x: "0" }) === false, "a non-special multiple of pi still runs");

var bounds = [
  { fn: "exp", center: "0", order: "4", x: "1/2" },
  { fn: "exp", center: "1", order: "3", x: "0.5" },
  { fn: "exp", center: "-2", order: "3", x: "-1.5" },
  { fn: "sin", center: "0", order: "5", x: "0.3" },
  { fn: "sin", center: "pi/6", order: "4", x: "0.6" },
  { fn: "cos", center: "0", order: "6", x: "0.4" },
  { fn: "ln1p", center: "0", order: "5", x: "0.5" },
  { fn: "ln1p", center: "0", order: "4", x: "-0.4" },
  { fn: "ln", center: "2", order: "3", x: "2.5" },
  { fn: "geom", center: "0", order: "5", x: "0.3" },
  { fn: "geom", center: "3", order: "3", x: "2.5" },
  { fn: "atan", center: "0", order: "7", x: "0.6" },
  { fn: "atan", center: "1", order: "4", x: "0.7" },
  { fn: "sqrt1p", center: "0", order: "4", x: "0.2" },
  { fn: "sqrt1p", center: "1", order: "3", x: "0.5" },
  { fn: "binom", param: "-1", center: "0", order: "4", x: "0.2" },
  { fn: "binom", param: "5/2", center: "0", order: "3", x: "0.2" },
  { fn: "binom", param: "4", center: "0", order: "2", x: "0.3" }
];
bounds.forEach(function (input) {
  var solved = solve(input);
  var err = errorOf(solved);
  var bound = lastNumber(solved.remainder);
  var name = input.fn + " a=" + input.center + " n=" + input.order;
  assert(err !== null && bound !== null && err <= bound * (1 + 1e-8) + 1e-12, name + " error " + err + " is within bound " + bound);
});

var outside = solve({ fn: "atan", center: "0", order: "3", x: "2" });
assert(outside.checkLines.join(" ").indexOf("outside") !== -1, "arctan check past radius is flagged");
var singular = solve({ fn: "ln1p", center: "0", order: "3", x: "-1" });
assert(singular.remainder.indexOf("no finite") !== -1 || singular.remainder.indexOf("unbounded") !== -1, "ln bound refuses the singularity");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("all taylor checks passed");
