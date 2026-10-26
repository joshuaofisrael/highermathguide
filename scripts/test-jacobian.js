/* Exact checks for the Jacobian calculator. */
"use strict";

var jac = require("../js/jacobian.js");
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

function point(values) {
  return values.map(function (value, idx) {
    return jac.parsePoint(value, "v" + idx);
  });
}

function text(solved) {
  return solved.lines.join("\n");
}

var square = jac.compute(["x^2-y^2", "2xy"], 2, point(["1", "0"]));
assert(square.jacobian[0].join(",") === "2x,-2y".replace(/-/g, jac.MINUS), "square partials row 1, got " + square.jacobian[0].join(","));
assert(square.jacobian[1].join(",") === "2y,2x", "square partials row 2, got " + square.jacobian[1].join(","));
assert(square.determinant === "4x^2 + 4y^2", "square determinant, got " + square.determinant);
assert(square.at.determinant === "4", "value at (1, 0) is 4");

var product = jac.compute(["x+y", "x*y"], 2, point(["1", "1"]));
assert(product.determinant.replace(jac.MINUS, "-") === "x - y" || product.determinant === "x " + jac.MINUS + " y", "product determinant is x minus y, got " + product.determinant);
assert(product.at.determinant === "0", "product determinant at (1, 1) is 0");

var scalar = jac.compute(["x^2*y"], 2, point(["1", "2"]));
assert(scalar.jacobian[0][0] === "2xy", "scalar partial x is 2xy, got " + scalar.jacobian[0][0]);
assert(scalar.jacobian[0][1] === "x^2", "scalar partial y is x^2");
assert(scalar.at.matrix[0].join(",") === "4,1", "scalar values at (1, 2)");
assert(scalar.determinant === null, "one output has no square determinant");

var recip = jac.compute(["1/(x+y)"], 2, null);
assert(recip.jacobian[0][0].indexOf("(x + y)^2") !== -1, "reciprocal partial keeps the squared denominator, got " + recip.jacobian[0][0]);

var power = jac.compute(["-x^2"], 1, point(["3"]));
assert(power.at.matrix[0][0] === jac.MINUS + "6", "derivative of -x^2 at 3 is -6, got " + power.at.matrix[0][0]);

var half = jac.compute(["1/2x"], 1, point(["4"]));
assert(half.at.matrix[0][0] === jac.MINUS + "1/32", "1/2x at 4 is -1/32, got " + half.at.matrix[0][0]);

var lnxy = jac.compute(["ln(x*y)"], 2, point(["2", "3"]));
assert(lnxy.at.matrix[0].join(",") === "1/2,1/3", "ln(xy) partials at (2, 3), got " + lnxy.at.matrix[0].join(","));

var cube = jac.compute(["(x+y)^3"], 2, point(["1", "1"]));
assert(cube.at.matrix[0][0] === "12" && cube.at.matrix[0][1] === "12", "expanded cube partials at (1, 1)");

var hyphenWords = text(square) + "\n" + text(product) + "\n" + text(scalar);
assert(hyphenWords.indexOf("-") === -1 && hyphenWords.indexOf("\u2013") === -1 && hyphenWords.indexOf("\u2014") === -1, "step text has no hyphen, en dash, or em dash");

var html = fs.readFileSync(path.join(__dirname, "../calculators/jacobian.html"), "utf8");
var preMatch = html.match(/<pre id="worked-static"[^>]*>([\s\S]*?)<\/pre>/);
assert(preMatch && preMatch[1] === text(square), "static worked example matches the square map");
var visible = html
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");
var dashAt = visible.search(/[-–—]/);
assert(dashAt === -1, "visible page text has no hyphen or dash" + (dashAt === -1 ? "" : ": " + JSON.stringify(visible.slice(Math.max(0, dashAt - 40), dashAt + 40))));
assert(html.indexOf("noindex") === -1 && html.indexOf("footer-note") === -1, "page stays indexable and has no copyright line");
assert(html.indexOf("Joshua Israel Ventures LLC") === -1, "calculator page does not name the LLC");
assert(html.indexOf("2a796980ec83472687c1d36c60177e23") !== -1, "analytics beacon is present");
assert(html.indexOf('"@type": "Person"') === -1, "no Person author");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("all Jacobian checks passed");
