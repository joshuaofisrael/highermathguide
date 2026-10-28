/* Hand checks for y' + P(x) y = Q(x) by an integrating factor.
 *
 * 1. y' + 2y = 4x, y(0) = 1.
 *    mu = e^(2x). ∫ 4x e^(2x) dx = e^(2x) (2x - 1).
 *    y = 2x - 1 + C e^(-2x). C = 2.
 *    y = 2x - 1 + 2 e^(-2x).
 *
 * 2. y' + y = sin(x), y(0) = 1.
 *    mu = e^x. Particular (1/2) sin(x) - (1/2) cos(x).
 *    C = 1 - (-1/2) = 3/2.
 *    y = (1/2) sin(x) - (1/2) cos(x) + (3/2) e^(-x).
 *
 * 3. y' + 2x y = 2x, y(0) = 3.
 *    mu = e^(x^2). Particular y_p = 1.
 *    y = 1 + C e^(-x^2). C = 2.
 *
 * 4. y' - y = e^x. Resonance. y = (x + C) e^x.
 * 5. y' + y = e^(2x). y = (1/3) e^(2x) + C e^(-x).
 * 6. y' + y = x e^x. y = e^x (x/2 - 1/4) + C e^(-x).
 * 7. y' + x y = x^3. y = x^2 - 2 + C e^(-x^2/2).
 * 8. y' = 2x + 3, y(1) = 0. y = x^2 + 3x - 4.
 * 9. y' + x y = 1 has no elementary antiderivative here.
 * 10. One RK4 step of y' = -y, y(0) = 1, h = 0.1.
 */
"use strict";

var m = require("../js/first-order-linear-ode.js");
var fs = require("fs");
var path = require("path");
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

var poly = S({
  pMode: "constant",
  p: "2",
  qMode: "poly",
  qCoeffs: ["0", "4"],
  x0: "0",
  y0: "1"
});
assert(poly.mode === "exact", "poly mode " + poly.mode + " " + (poly.reason || ""));
assert(poly.particular.indexOf("2x") >= 0, "poly particular has 2x: " + poly.particular);
assert(poly.particular.indexOf(m.MINUS + " 1") >= 0 || poly.particular.indexOf(m.MINUS + "1") >= 0, "poly particular has -1: " + poly.particular);
assert(poly.cExact === "2", "poly C " + poly.cExact);
assert(poly.general.indexOf("e^(" + m.MINUS + "2x)") >= 0, "poly general homo " + poly.general);
assert(m.verifyNumeric(poly).ok, "poly satisfies ODE " + JSON.stringify(m.verifyNumeric(poly)));
assert(Math.abs(m.evalY(poly.numeric, 0) - 1) < 1e-9, "poly y(0)");
assert(Math.abs(m.evalYp(poly.numeric, 0) + 2) < 1e-8, "poly y'(0) is -2, got " + m.evalYp(poly.numeric, 0));

var trig = S({
  pMode: "constant",
  p: "1",
  qMode: "trig",
  qCoeffs: ["1"],
  A: "1",
  B: "0",
  b: "1",
  x0: "0",
  y0: "1"
});
assert(trig.mode === "exact", "trig mode");
assert(trig.cExact === "3/2", "trig C " + trig.cExact + " formula " + trig.particular);
assert(trig.particular.indexOf("sin") >= 0 && trig.particular.indexOf("cos") >= 0, "trig has sin and cos " + trig.particular);
assert(m.verifyNumeric(trig).ok, "trig satisfies ODE " + JSON.stringify(m.verifyNumeric(trig)));
assert(Math.abs(m.evalY(trig.numeric, 0) - 1) < 1e-9, "trig y(0) " + m.evalY(trig.numeric, 0));

var factor = S({
  pMode: "poly",
  pCoeffs: ["0", "2"],
  qMode: "poly",
  qCoeffs: ["0", "2"],
  x0: "0",
  y0: "3"
});
assert(factor.mode === "exact", "factor mode " + (factor.reason || "") + " " + (factor.text || "").slice(0, 200));
assert(factor.cExact === "2", "factor C " + factor.cExact);
assert(factor.particular.indexOf("e^(" + m.MINUS + "x^2)") >= 0, "factor homo " + factor.particular);
assert(m.verifyNumeric(factor).ok, "factor satisfies ODE " + JSON.stringify(m.verifyNumeric(factor)));
assert(Math.abs(m.evalY(factor.numeric, 0) - 3) < 1e-9, "factor y(0)");

var resonance = S({ pMode: "constant", p: "-1", qMode: "exp", qCoeffs: ["1"], k: "1" });
assert(resonance.mode === "exact", "resonance mode");
assert(resonance.general.indexOf("x") >= 0, "resonance has x " + resonance.general);
assert(m.verifyNumeric(resonance).ok, "resonance ODE " + JSON.stringify(m.verifyNumeric(resonance)));
assert(Math.abs(m.evalYp(resonance.numeric, 0.3) - m.evalY(resonance.numeric, 0.3) - Math.exp(0.3)) < 1e-6, "resonance residual at 0.3");

var exp = S({ pMode: "constant", p: "1", qMode: "exp", qCoeffs: ["1"], k: "2" });
assert(exp.mode === "exact", "exp mode");
assert(exp.general.indexOf("1/3") >= 0, "exp coefficient 1/3 " + exp.general);
assert(m.verifyNumeric(exp).ok, "exp ODE " + JSON.stringify(m.verifyNumeric(exp)));

var xe = S({ pMode: "constant", p: "1", qMode: "exp", qCoeffs: ["0", "1"], k: "1" });
assert(xe.mode === "exact", "x e^x mode");
assert(xe.general.indexOf("1/2") >= 0 && xe.general.indexOf("1/4") >= 0, "x e^x coefficients " + xe.general);
assert(m.verifyNumeric(xe).ok, "x e^x ODE " + JSON.stringify(m.verifyNumeric(xe)));

var cubic = S({ pMode: "poly", pCoeffs: ["0", "1"], qMode: "poly", qCoeffs: ["0", "0", "0", "1"] });
assert(cubic.mode === "exact", "cubic mode " + (cubic.reason || ""));
assert(cubic.general.indexOf("x^2") >= 0, "cubic has x^2 " + cubic.general);
assert(cubic.general.indexOf(m.MINUS + " 2") >= 0 || cubic.general.indexOf(m.MINUS + "2") >= 0, "cubic has -2 " + cubic.general);
assert(m.verifyNumeric(cubic).ok, "cubic ODE " + JSON.stringify(m.verifyNumeric(cubic)));

var pure = S({ pMode: "constant", p: "0", qMode: "poly", qCoeffs: ["3", "2"], x0: "1", y0: "0" });
assert(pure.mode === "exact", "pure integral mode");
assert(pure.cExact === m.MINUS + "4", "pure C " + pure.cExact + " " + pure.particular);
assert(pure.particular.indexOf("x^2") >= 0, "pure has x^2 " + pure.particular);
assert(m.verifyNumeric(pure).ok, "pure ODE " + JSON.stringify(m.verifyNumeric(pure)));
assert(Math.abs(m.evalY(pure.numeric, 1)) < 1e-9, "pure y(1)");

var half = S({ pMode: "constant", p: "1/2", qMode: "poly", qCoeffs: ["1"] });
assert(half.mode === "exact", "half mode");
assert(half.general.indexOf("2") >= 0, "half particular 2 " + half.general);
assert(m.verifyNumeric(half).ok, "half ODE");

var xsin = S({
  pMode: "constant",
  p: "1",
  qMode: "trig",
  qCoeffs: ["0", "1"],
  A: "1",
  B: "0",
  b: "1"
});
assert(xsin.mode === "exact", "x sin mode");
assert(m.verifyNumeric(xsin).ok, "x sin ODE " + JSON.stringify(m.verifyNumeric(xsin)) + " " + xsin.general);

var none = S({
  pMode: "poly",
  pCoeffs: ["0", "1"],
  qMode: "poly",
  qCoeffs: ["1"],
  x0: "0",
  y0: "0",
  xEnd: "1",
  nSteps: "10"
});
assert(none.mode === "rk4", "non-elementary is RK4, not a formula: " + none.mode);
assert(none.text.indexOf("not elementary") >= 0 || none.text.indexOf("not in the closed-form") >= 0, "labelled non-elementary");
assert(none.text.indexOf("Runge-Kutta") >= 0, "names Runge-Kutta");
assert(none.table.rows.length === 11, "10 steps give 11 rows");
assert(Math.abs(none.table.rows[0].y) < 1e-12, "RK4 starts at y(0)=0");
assert(none.table.rows[0].x === 0 && Math.abs(none.table.rows[10].x - 1) < 1e-12, "RK4 ends at 1");

var needs = S({ pMode: "poly", pCoeffs: ["0", "1"], qMode: "poly", qCoeffs: ["1"] });
assert(needs.mode === "needs-ic", "non-elementary without IC does not invent a formula");
assert(!needs.general, "no general formula string");

var rk = m.rk4(function () { return 1; }, function () { return 0; }, 0, 1, 0.1, 1);
var yStep = rk.rows[1].y;
assert(Math.abs(yStep - 0.9048375) < 1e-7, "one RK4 step of y'=-y " + yStep);
assert(Math.abs(yStep - Math.exp(-0.1)) < 1e-6, "RK4 step near e^(-0.1)");

var rkExact = m.rk4(
  function () { return 2; },
  function (x) { return 4 * x; },
  0,
  1,
  1,
  200
);
var yExact = 2 * 1 - 1 + 2 * Math.exp(-2);
assert(Math.abs(rkExact.rows[200].y - yExact) < 1e-8, "RK4 tracks 2x-1+2e^(-2x) " + rkExact.rows[200].y + " vs " + yExact);

var mismatch = S({
  pMode: "poly",
  pCoeffs: ["0", "1"],
  qMode: "poly",
  qCoeffs: ["1", "1"],
  x0: "0",
  y0: "0",
  xEnd: "0.5",
  nSteps: "8"
});
assert(mismatch.mode === "rk4", "y' + x y = x + 1 has no polynomial particular solution");

var polyOk = S({ pMode: "poly", pCoeffs: ["1", "1"], qMode: "poly", qCoeffs: ["1", "1", "1"] });
assert(polyOk.mode === "exact", "y' + (1+x)y = 1 + x + x^2");
assert(polyOk.general.indexOf("x") >= 0, "particular includes x " + polyOk.general);
assert(m.verifyNumeric(polyOk).ok, "shifted linear P satisfies ODE " + JSON.stringify(m.verifyNumeric(polyOk)));

var bad = null;
try { S({ pMode: "constant", p: "1", qMode: "poly", qCoeffs: ["1"], x0: "0" }); }
catch (err) { bad = err.message; }
assert(bad && bad.indexOf("both") >= 0, "half initial condition is rejected");

var html = fs.readFileSync(path.join(__dirname, "../calculators/first-order-linear-ode.html"), "utf8");
assert(html.indexOf("<h1>") === html.lastIndexOf("<h1>"), "one H1");
assert(html.indexOf("https://highermathguide.com/calculators/first-order-linear-ode.html") >= 0, "canonical host");
assert(html.indexOf("cloudflareinsights.com/beacon.min.js") >= 0, "beacon");
assert(html.indexOf("Joshua") < 0, "no personal name");
assert(html.indexOf("Last reviewed: 28 October 2026") >= 0, "review date");
assert(html.indexOf("integrating factor calculator") >= 0, "target phrase");
assert(html.indexOf("FAQPage") >= 0 && html.indexOf("BreadcrumbList") >= 0 && html.indexOf("WebApplication") >= 0, "json-ld types");
assert(html.indexOf("pagead2.googlesyndication.com/pagead/js/adsbygoogle.js") >= 0, "adsense");
var faqs = [];
var faqRe = /<section class="faq-item"[^>]*>\s*<h2>([^<]*)<\/h2>\s*<p>([\s\S]*?)<\/p>/g;
var faqMatch;
while ((faqMatch = faqRe.exec(html))) faqs.push({ name: faqMatch[1], text: faqMatch[2].replace(/\s+/g, " ").trim() });
var ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
var graph = JSON.parse(ld[1]);
var faqPage = graph["@graph"].filter(function (node) { return node["@type"] === "FAQPage"; })[0];
assert(faqs.length === faqPage.mainEntity.length, "FAQ count " + faqs.length);
faqPage.mainEntity.forEach(function (q, i) {
  assert(faqs[i] && faqs[i].name === q.name, "FAQ name " + q.name);
  assert(faqs[i] && faqs[i].text === q.acceptedAnswer.text, "FAQ text matches schema: " + q.name);
});

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("all first-order linear checks passed");
