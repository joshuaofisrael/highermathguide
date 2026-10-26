/* Table checks for the Laplace calculator. */
"use strict";

var L = require("../js/laplace.js");
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
  assert(Number.isFinite(a) && Math.abs(a - b) <= 1e-9 * (1 + Math.abs(b)), msg + " got " + a + " expected " + b);
}

function fwd(expr) {
  var r = L.forward(expr);
  assert(r.ok, expr + " forward ok " + (r.ok ? "" : r.error));
  return r;
}

function inv(expr) {
  var r = L.inverse(expr);
  assert(r.ok, expr + " inverse ok " + (r.ok ? "" : r.error));
  return r;
}

function expectForward(expr, answer) {
  var r = fwd(expr);
  assert(r.answer === answer, expr + " -> " + r.answer + " expected " + answer);
  return r;
}

function expectInverse(expr, answer) {
  var r = inv(expr);
  assert(r.answer === answer, expr + " -> " + r.answer + " expected " + answer);
  return r;
}

var M = L.MINUS;

expectForward("1", "1/s");
expectForward("5", "5/s");
expectForward("t", "1/s^2");
expectForward("t^2", "2/s^3");
expectForward("t^3", "6/s^4");
expectForward("3*t^2", "6/s^3");
expectForward("e^(3t)", "1/(s " + M + " 3)");
expectForward("e^(-2t)", "1/(s + 2)");
expectForward("e^t", "1/(s " + M + " 1)");
expectForward("sin(5t)", "5/(s^2 + 25)");
expectForward("cos(5t)", "s/(s^2 + 25)");
expectForward("sinh(2t)", "2/(s^2 " + M + " 4)");
expectForward("cosh(2t)", "s/(s^2 " + M + " 4)");
expectForward("t*e^(3t)", "1/(s " + M + " 3)^2");
expectForward("t^2*e^(3t)", "2/(s " + M + " 3)^3");
expectForward("e^(2t)*sin(3t)", "3/((s " + M + " 2)^2 + 9)");
expectForward("e^(2t)*cos(3t)", "(s " + M + " 2)/((s " + M + " 2)^2 + 9)");
expectForward("e^(-2t)*sin(3t)", "3/((s + 2)^2 + 9)");
expectForward("sinh(2t)*e^(3t)", "2/((s " + M + " 3)^2 " + M + " 4)");
expectForward("e^(3t)*cosh(2t)", "(s " + M + " 3)/((s " + M + " 3)^2 " + M + " 4)");

var ivp = expectForward("2*e^(-t)-e^(-2*t)", "(s + 3)/((s + 1)(s + 2))");
assert(ivp.pieces[0] === "2/(s + 1)", "piece 2/(s+1) -> " + ivp.pieces[0]);
assert(ivp.pieces[1] === M + "1/(s + 2)", "piece minus 1/(s+2) -> " + ivp.pieces[1]);
assert(ivp.steps.join("\n").indexOf("Linearity") >= 0, "linearity is named");
assert(ivp.steps.join("\n").indexOf("Table rule") >= 0, "table rule is named");
assert(ivp.steps.join("\n").indexOf("First shift") >= 0, "shift theorem is named");

var shift = fwd("e^(2*t)*sin(3*t)");
assert(shift.steps.join("\n").indexOf("First shift") >= 0, "shifted sine names the shift");
assert(shift.steps.join("\n").indexOf("sin(bt)") >= 0, "shifted sine names the sine rule");

var tsin = expectForward("t*sin(t)", "2s/(s^2 + 1)^2");
assert(tsin.steps.join("\n").indexOf("multiplication-by-t") >= 0, "t sin names multiplication by t");
expectForward("t*cos(t)", "(s^2 " + M + " 1)/(s^2 + 1)^2");
expectForward("sin(-3t)", M + "3/(s^2 + 9)");
expectForward("cos(-3t)", "s/(s^2 + 9)");
expectForward("e^2t", "1/(s " + M + " 2)");
expectForward("2e^(-t)", "2/(s + 1)");
expectForward("(1/2)*t", "(1/2)/s^2");
expectForward("0", "0");
expectForward("e^(t)+e^(t)", "2/(s " + M + " 1)");

near(fwd("sin(5t)").valueAt(3), 5 / 34, "sin(5t) at s=3");
near(fwd("1").valueAt(4), 0.25, "1 at s=4");
near(ivp.valueAt(5), (5 + 3) / ((5 + 1) * (5 + 2)), "ivp rational at s=5");

expectInverse("1/s", "1");
expectInverse("1/s^2", "t");
expectInverse("2/s^3", "t^2");
expectInverse("6/s^4", "t^3");
expectInverse("1/(s-4)", "e^(4t)");
expectInverse("1/(s+2)", "e^(" + M + "2t)");
expectInverse("6/(s-1)^4", "t^3 e^t");
expectInverse("1/(s-1)^2", "t e^t");
expectInverse("5/(s^2+25)", "sin(5t)");
expectInverse("s/(s^2+4)", "cos(2t)");
expectInverse("2/(s^2-4)", "sinh(2t)");
expectInverse("s/(s^2-4)", "cosh(2t)");
expectInverse("5/(s^2-4)", "(5/2) sinh(2t)");
expectInverse("(s+3)/((s+1)*(s+2))", "2 e^(" + M + "t) " + M + " e^(" + M + "2t)");
expectInverse("3/((s-2)^2+9)", "e^(2t) sin(3t)");
expectInverse("(s-2)/((s-2)^2+9)", "e^(2t) cos(3t)");
expectInverse("(2*s+3)/(s^2+4*s+13)", "2 e^(" + M + "2t) cos(3t) " + M + " (1/3) e^(" + M + "2t) sin(3t)");
expectInverse("2/((s-5)*(s-1))", "e^(3t) sinh(2t)");
expectInverse("1/(s^2+s+1)", "(2 sqrt(3))/3 e^(" + M + "t/2) sin((sqrt(3)/2) t)");

var round = inv(fwd("2*e^(-t)-e^(-2*t)").answer);
assert(round.answer === "2 e^(" + M + "t) " + M + " e^(" + M + "2t)", "round trip ivp -> " + round.answer);
var round2 = fwd(inv("3/((s-2)^2+9)").answer);
assert(round2.answer === "3/((s " + M + " 2)^2 + 9)", "round trip shifted sine -> " + round2.answer);

var bad = L.forward("tan(t)");
assert(!bad.ok && bad.error.indexOf("Tangent") >= 0, "tan rejected -> " + bad.error);
var log = L.forward("ln(t)");
assert(!log.ok, "ln rejected");
var recip = L.forward("1/t");
assert(!recip.ok && recip.error.indexOf("1/t") >= 0, "1/t rejected -> " + recip.error);
var prod = L.forward("sin(t)*cos(t)");
assert(!prod.ok && prod.error.indexOf("product") >= 0, "product rejected -> " + prod.error);
var step = L.forward("u(t-1)");
assert(!step.ok && step.error.indexOf("step") >= 0, "step rejected -> " + step.error);
var phase = L.forward("sin(2t+1)");
assert(!phase.ok && phase.error.indexOf("phase") >= 0, "phase rejected -> " + phase.error);
var imp = L.inverse("1");
assert(!imp.ok && imp.error.indexOf("impulse") >= 0, "constant inverse rejected -> " + imp.error);
var improper = L.inverse("(s^2)/(s+1)");
assert(!improper.ok && improper.error.indexOf("improper") >= 0, "improper rejected -> " + improper.error);
var repeatQ = L.inverse("1/(s^2+1)^2");
assert(!repeatQ.ok && repeatQ.error.indexOf("repeated quadratic") >= 0, "repeated quadratic rejected -> " + repeatQ.error);
var cubic = L.inverse("1/(s^3+s+1)");
assert(!cubic.ok, "unfactorable cubic rejected -> " + (cubic.ok ? cubic.answer : cubic.error));
var mode = L.inverse("e^(-t)");
assert(!mode.ok, "exponential in inverse mode rejected -> " + mode.error);

var quadInv = inv("(2*s+3)/(s^2+4*s+13)");
assert(quadInv.steps.join("\n").indexOf("Complete the square") >= 0, "quadratic inverse shows the square");
assert(quadInv.steps.join("\n").indexOf("Partial fractions") >= 0, "partial fractions named");

var fs = require("fs");
var htmlPath = require("path").join(__dirname, "../calculators/laplace-transform.html");
if (!fs.existsSync(htmlPath)) {
  console.error("missing page");
  process.exit(1);
}
var html = fs.readFileSync(htmlPath, "utf8");
assert(html.indexOf("<h1>") === html.lastIndexOf("<h1>"), "one H1");
assert(html.indexOf("https://highermathguide.com/calculators/laplace-transform.html") >= 0, "canonical host");
assert(html.indexOf("cloudflareinsights.com/beacon.min.js") >= 0, "beacon");
assert(html.indexOf("Joshua") < 0, "no personal name");
assert(html.indexOf("Last reviewed: 26 October 2026") >= 0, "review date");
assert(html.indexOf("laplace transform calculator with steps") >= 0 || html.indexOf("Laplace transform calculator with steps") >= 0, "steps query in title or description");
assert(html.indexOf("FAQPage") >= 0 && html.indexOf("BreadcrumbList") >= 0 && html.indexOf("WebApplication") >= 0, "json-ld types");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("all laplace checks passed");
