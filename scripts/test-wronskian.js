/* Hand checks for the Wronskian calculator.
 *
 * e^x, e^(2x): W = e^(3x). At 0 this is 1.
 * sin x, cos x: W = -1.
 * x, x^2: W = x^2, which is 0 at 0 and does not prove dependence.
 * e^x, 2e^x: W = 0, and y2 = 2 y1.
 * 1, x, x^2: W = 2.
 * x e^x, e^x: W = -e^(2x).
 * ln x, x at 1: W = ln(x) - 1 = -1.
 * sin(2x), cos(2x): W = -2.
 * e^(-x), e^(-2x): W = -e^(-3x).
 */
"use strict";

var w = require("../js/wronskian.js");
var failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL " + msg);
  } else {
    console.log("ok " + msg);
  }
}

function near(a, b, msg) {
  var tol = 1e-6 * (1 + Math.abs(b));
  assert(Number.isFinite(a) && Math.abs(a - b) <= tol, msg + " got " + a + " expected " + b);
}

assert(w.simplifyText("e^x") === "e^x", "simplify e^x");
assert(w.simplifyText("e^(2x)") === "e^(2x)", "simplify e^(2x) -> " + w.simplifyText("e^(2x)"));
assert(w.simplifyText("e^2x") === "e^(2x)", "e^2x means e^(2x) -> " + w.simplifyText("e^2x"));
assert(w.simplifyText("e^{-x}") === "e^(" + "\u2212" + "x)", "e^{-x} -> " + w.simplifyText("e^{-x}"));
assert(w.derivativeText("e^(2x)") === "2 e^(2x)", "derivative e^(2x) -> " + w.derivativeText("e^(2x)"));
assert(w.derivativeText("sin x") === "cos(x)", "derivative sin x -> " + w.derivativeText("sin x"));
assert(w.derivativeText("cos x") === "\u2212sin(x)", "derivative cos x -> " + w.derivativeText("cos x"));
assert(w.derivativeText("ln x") === "1/x", "derivative ln x -> " + w.derivativeText("ln x"));
assert(w.derivativeText("x^2") === "2x", "derivative x^2 -> " + w.derivativeText("x^2"));
assert(w.derivativeText("(x+1)^2") === "2x + 2", "derivative (x+1)^2 -> " + w.derivativeText("(x+1)^2"));
assert(w.derivativeText("1/x") === "\u22121/x^2", "derivative 1/x -> " + w.derivativeText("1/x"));
assert(w.derivativeText("sqrt(x)") === "1/(2 sqrt(x))", "derivative sqrt(x) -> " + w.derivativeText("sqrt(x)"));
assert(w.derivativeText("x*e^x") === "e^x + x e^x" || w.derivativeText("x*e^x") === "x e^x + e^x", "derivative x e^x -> " + w.derivativeText("x*e^x"));
assert(w.simplifyText("sin(x)^2 + cos(x)^2") === "1", "sin^2+cos^2 -> " + w.simplifyText("sin(x)^2 + cos(x)^2"));
assert(w.simplifyText("log(x)") === "ln(x)", "log is ln -> " + w.simplifyText("log(x)"));

var exp = w.compute(["e^x", "e^(2x)"], "0");
assert(exp.determinant === "e^(3x)", "W(e^x, e^(2x)) -> " + exp.determinant);
assert(exp.valueText === "1", "W at 0 is 1 -> " + exp.valueText);
assert(exp.neverZero === true, "exponential Wronskian never zero");
assert(exp.conclusion.indexOf("does not prove linear dependence") >= 0, "caveat on exponentials");
assert(exp.conclusion.indexOf("linearly independent") >= 0, "exponentials independent");

var trig = w.compute(["sin x", "cos x"], "0");
assert(trig.determinant === "\u22121", "W(sin, cos) -> " + trig.determinant);
assert(trig.valueText === "\u22121", "trig value -> " + trig.valueText);
assert(trig.neverZero === true, "trig constant never zero");

var swapped = w.compute(["cos x", "sin x"], "0.3");
assert(swapped.determinant === "1", "W(cos, sin) -> " + swapped.determinant);

var zeroAt = w.compute(["x", "x^2"], "0");
assert(zeroAt.determinant === "x^2", "W(x, x^2) -> " + zeroAt.determinant);
assert(zeroAt.valueText === "0", "W(0) for x, x^2");
assert(zeroAt.identicallyZero === false, "x^2 is not the zero function");
assert(zeroAt.conclusion.indexOf("does not prove") >= 0, "zero at a point caveat");
var away = w.compute(["x", "x^2"], "1");
assert(away.valueText === "1", "W(1) for x, x^2");
assert(away.conclusion.indexOf("linearly independent") >= 0, "nonzero point proves independence");

var dep = w.compute(["e^x", "2*e^x"], "1");
assert(dep.determinant === "0", "constant multiple has W 0 -> " + dep.determinant);
assert(dep.identicallyZero === true, "identically zero");
assert(dep.conclusion.indexOf("2 y") >= 0, "names the relation -> " + dep.conclusion);

var poly = w.compute(["1", "x", "x^2"], "0");
assert(poly.determinant === "2", "W(1, x, x^2) -> " + poly.determinant);
assert(poly.valueText === "2", "triple poly value");
assert(poly.columns.length === 3, "three columns");
assert(poly.columns[0].cells.length === 3, "three rows");
assert(poly.columns[2].cells[2].text === "2", "second derivative of x^2 -> " + poly.columns[2].cells[2].text);

var xe = w.compute(["x*e^x", "e^x"], "0");
assert(xe.determinant === "\u2212e^(2x)", "W(x e^x, e^x) -> " + xe.determinant);
near(xe.value, -1, "W(0) = -1");

var ln = w.compute(["ln x", "x"], "1");
assert(ln.determinant === "ln(x) \u2212 1", "W(ln x, x) -> " + ln.determinant);
assert(ln.valueText === "\u22121", "ln value at 1");

var double = w.compute(["sin(2x)", "cos(2x)"], "0");
assert(double.determinant === "\u22122", "W(sin 2x, cos 2x) -> " + double.determinant);

var negExp = w.compute(["e^(-x)", "e^(-2x)"], "0");
assert(negExp.determinant === "\u2212e^(" + "\u2212" + "3x)", "W(e^{-x}, e^{-2x}) -> " + negExp.determinant);
near(negExp.value, -1, "negative exponentials at 0");

var threeExp = w.compute(["e^x", "e^(2x)", "e^(3x)"], "0");
assert(threeExp.determinant === "2 e^(6x)", "Vandermonde exponentials -> " + threeExp.determinant);
assert(threeExp.valueText === "2", "Vandermonde exponentials at 0");

var repeated = w.compute(["e^x", "x*e^x", "x^2*e^x"], "0");
assert(repeated.determinant === "2 e^(3x)", "repeated-root triple -> " + repeated.determinant);
assert(repeated.neverZero === true, "repeated-root triple never zero");

var hole = w.compute(["ln x", "1"], "0");
assert(hole.defined === false, "ln x is undefined at 0");
assert(hole.determinant === "\u22121/x", "W(ln x, 1) -> " + hole.determinant);

var halfTurn = w.compute(["sin x", "cos x"], "pi/2");
assert(halfTurn.x0Text === "pi/2", "x0 pi/2 -> " + halfTurn.x0Text);
assert(halfTurn.valueText === "\u22121", "trig value at pi/2");

near(w.evalNode(w.parseExpr("sin(x)^2"), Math.PI / 4), 0.5, "eval sin^2 at pi/4");
var dSin2 = w.derivativeText("sin(x)^2");
var dNode = w.parseExpr(dSin2.replace(/\u2212/g, "-"));
near(w.evalNode(dNode, Math.PI / 4), 1, "derivative of sin^2 at pi/4 is 1, formula " + dSin2);

var bad = false;
try { w.simplifyText("y^2"); } catch (err) { bad = /x/.test(err.message); }
assert(bad, "unknown variable is rejected");

var absOut = w.compute(["abs(x)", "x"], "1");
assert(absOut.symbolic === false, "abs falls back to numeric");
assert(absOut.conclusion.indexOf("does not prove linear dependence") >= 0, "numeric caveat");
near(Number(String(absOut.valueText).replace("\u2212", "-")), 0, "abs(x) and x have W 0 for x>0? actually W(abs, x) at 1");

console.log(failed ? failed + " failed" : "all wronskian checks passed");
process.exit(failed ? 1 : 0);
