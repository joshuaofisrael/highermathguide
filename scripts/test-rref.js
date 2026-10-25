/* Exact checks for reduced row echelon form and linear systems. */
"use strict";

var fs = require("fs");
var path = require("path");
var m = require("../js/rref-exact.js");
var failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL " + msg);
  } else {
    console.log("ok " + msg);
  }
}

function M(rows) {
  return rows.map(function (row) {
    return row.map(function (entry) { return m.parseEntry(entry); });
  });
}

function rowText(solved, i) {
  return solved.rref[i].map(m.fmt).join(" ");
}

function matrixText(solved) {
  return solved.rref.map(function (row) { return row.map(m.fmt).join(" "); }).join(" | ");
}

function text(solved) {
  return solved.lines.join("\n");
}

function dot(row, values) {
  var s = m.ZERO;
  for (var i = 0; i < row.length; i++) s = m.add(s, m.mul(row[i], values[i]));
  return s;
}

function assertSystem(original, values, msg) {
  var coeffs = original.map(function (row) { return row.slice(0, row.length - 1); });
  var constants = original.map(function (row) { return row[row.length - 1]; });
  for (var i = 0; i < coeffs.length; i++) {
    var got = dot(coeffs[i], values);
    assert(m.eq(got, constants[i]), msg + " equation " + (i + 1) + " got " + m.fmt(got) + " want " + m.fmt(constants[i]));
  }
}

function rrefShape(solved) {
  var pivots = [];
  var lastPivotCol = -1;
  for (var i = 0; i < solved.rref.length; i++) {
    var pivot = -1;
    for (var j = 0; j < solved.rref[i].length; j++) {
      if (!m.isZero(solved.rref[i][j])) {
        pivot = j;
        break;
      }
    }
    if (pivot < 0) {
      for (var z = i + 1; z < solved.rref.length; z++) {
        for (var c = 0; c < solved.rref[z].length; c++) {
          if (!m.isZero(solved.rref[z][c])) return "zero row is not at the bottom";
        }
      }
      continue;
    }
    if (!m.eq(solved.rref[i][pivot], m.ONE)) return "pivot is not 1";
    if (pivot <= lastPivotCol) return "pivots do not move right";
    for (var r = 0; r < solved.rref.length; r++) {
      if (r !== i && !m.isZero(solved.rref[r][pivot])) return "pivot column is not clear";
    }
    lastPivotCol = pivot;
    pivots.push(pivot + 1);
  }
  return pivots;
}

var uniqueRaw = [
  ["0", "1", "1", "5"],
  ["1", "1", "1", "6"],
  ["1", "2", "\u22121", "2"]
];
var unique = m.solve(M(uniqueRaw), { augmented: true });
assert(matrixText(unique) === "1 0 0 1 | 0 1 0 2 | 0 0 1 3", "unique 3 by 3 RREF is " + matrixText(unique));
assert(unique.rank === 3 && unique.coefficientRank === 3, "unique rank is 3");
assert(unique.pivotColumns.join(",") === "1,2,3", "unique pivot columns are 1, 2, 3, got " + unique.pivotColumns.join(","));
assert(unique.status === "unique" && unique.inconsistentRow === null, "unique status");
assert(unique.variables.map(function (v) { return v.text; }).join("; ") === "x\u2081 = 1; x\u2082 = 2; x\u2083 = 3", "unique solution text " + unique.variables.map(function (v) { return v.text; }).join("; "));
assert(text(unique).indexOf("Swap row 1 and row 2") !== -1, "unique example swaps the zero pivot");
assert(text(unique).indexOf("The system has a unique solution.") !== -1, "unique explanation");
assertSystem(M(uniqueRaw), [m.parseEntry("1"), m.parseEntry("2"), m.parseEntry("3")], "unique solution");
var uniqueShape = rrefShape(unique);
assert(Array.isArray(uniqueShape) && uniqueShape.join(",") === "1,2,3", "unique matrix has RREF shape");

var freeRaw = [
  ["1", "2", "0", "5"],
  ["0", "0", "1", "4"],
  ["2", "4", "0", "10"]
];
var free = m.solve(M(freeRaw), { augmented: true });
assert(matrixText(free) === "1 2 0 5 | 0 0 1 4 | 0 0 0 0", "free variable RREF is " + matrixText(free));
assert(free.rank === 2 && free.coefficientRank === 2, "free system rank is 2");
assert(free.pivotColumns.join(",") === "1,3", "free pivot columns are 1 and 3, got " + free.pivotColumns.join(","));
assert(free.status === "infinite" && free.free.length === 1 && free.free[0].parameter === "t", "one free variable named t");
assert(free.variables.map(function (v) { return v.text; }).join("; ") === "x\u2081 = 5 \u2212 2t; x\u2082 = t; x\u2083 = 4", "parametric text " + free.variables.map(function (v) { return v.text; }).join("; "));
assert(text(free).indexOf("infinitely many solutions") !== -1, "free explanation");
assertSystem(M(freeRaw), [m.parseEntry("5"), m.parseEntry("0"), m.parseEntry("4")], "particular solution t = 0");
assertSystem(M(freeRaw), [m.parseEntry("3"), m.parseEntry("1"), m.parseEntry("4")], "particular solution t = 1");
assertSystem(M(freeRaw), [m.parseEntry("1/2"), m.parseEntry("9/4"), m.parseEntry("4")], "particular solution t = 9/4");

var noneRaw = [
  ["1", "2", "3"],
  ["2", "4", "7"]
];
var none = m.solve(M(noneRaw), { augmented: true });
assert(matrixText(none) === "1 2 0 | 0 0 1", "inconsistent RREF is " + matrixText(none));
assert(none.status === "none" && none.inconsistentRow === 2, "inconsistent row is 2, got " + none.inconsistentRow);
assert(none.rank === 2 && none.coefficientRank === 1, "inconsistent ranks differ");
assert(none.pivotColumns.join(",") === "1,3", "inconsistent pivot columns include the constants");
assert(text(none).indexOf("0 = 1") !== -1, "inconsistent row says 0 = 1");
assert(text(none).indexOf("The system has no solution.") !== -1, "no solution explanation");
assert(text(none).indexOf("Row 2 of the reduced matrix reads 0, 0 | 1.") !== -1, "inconsistent row is quoted");

var wideRaw = [
  ["1", "2", "3", "4", "5"],
  ["2", "4", "7", "8", "11"],
  ["1", "2", "3", "6", "9"],
  ["3", "6", "10", "12", "17"]
];
var wide = m.solve(M(wideRaw), { augmented: false });
assert(matrixText(wide) === "1 2 0 0 0 | 0 0 1 0 0 | 0 0 0 1 0 | 0 0 0 0 1", "4 by 5 RREF is " + matrixText(wide));
assert(wide.rank === 4 && wide.status === "matrix" && wide.coefficientRank === null, "4 by 5 rank is 4 and it is not solved as a system");
assert(wide.pivotColumns.join(",") === "1,3,4,5", "4 by 5 pivot columns");
assert(text(wide).indexOf("not treated as constants") !== -1, "plain matrix does not claim a solution");
assert(Array.isArray(rrefShape(wide)), "4 by 5 has RREF shape");

var fracRaw = [
  ["0", "1/2", "1/3"],
  ["2/3", "0", "1"],
  ["1", "1/4", "0"]
];
var frac = m.solve(M(fracRaw), { augmented: false });
assert(matrixText(frac) === "1 0 0 | 0 1 0 | 0 0 1", "fraction matrix with a zero pivot reduces to I, got " + matrixText(frac));
assert(frac.rank === 3 && frac.pivotColumns.join(",") === "1,2,3", "fraction rank and pivots");
assert(text(frac).indexOf("Swap row 1 and row 2") !== -1, "fraction matrix swaps the zero pivot");
assert(text(frac).indexOf("Multiply row 1 by 3/2") !== -1, "fraction matrix scales by 3/2");
var decimalTwin = m.solve(M([
  ["1", "1", "0.333"],
  ["0", "1", "0"]
]), { augmented: true });
var third = m.solve(M([
  ["1", "1", "1/3"],
  ["0", "1", "0"]
]), { augmented: true });
assert(decimalTwin.variables[0].text === "x\u2081 = 333/1000", "0.333 stays 333/1000, got " + decimalTwin.variables[0].text);
assert(third.variables[0].text === "x\u2081 = 1/3", "1/3 stays 1/3");
assert(decimalTwin.variables[0].text !== third.variables[0].text, "a truncated decimal is not the same fraction");
var half = m.solve(M([
  ["0", "0.5", "1/3"],
  ["2/3", "0", "1.0"],
  ["1", ".25", "0"]
]), { augmented: false });
assert(matrixText(half) === matrixText(frac), "0.5 and .25 match 1/2 and 1/4");

var swapFar = m.solve(M([
  ["0", "0", "1"],
  ["0", "1", "0"],
  ["1", "0", "0"]
]), { augmented: false });
assert(matrixText(swapFar) === "1 0 0 | 0 1 0 | 0 0 1", "swap with row 3 still reaches I");
assert(text(swapFar).indexOf("Swap row 1 and row 3") !== -1, "swap reaches row 3");

var twoFree = m.solve(M([
  ["1", "\u22122", "1/2", "3", "4"],
  ["2", "\u22124", "1", "6", "8"],
  ["0", "0", "0", "1", "5"]
]), { augmented: true });
assert(twoFree.status === "infinite" && twoFree.free.map(function (f) { return f.parameter; }).join(",") === "t,s", "two parameters t and s");
assert(matrixText(twoFree) === "1 \u22122 1/2 0 \u221211 | 0 0 0 1 5 | 0 0 0 0 0", "two free RREF is " + matrixText(twoFree));
assert(twoFree.variables.map(function (v) { return v.text; }).join("; ") === "x\u2081 = \u221211 + 2t \u2212 (1/2)s; x\u2082 = t; x\u2083 = s; x\u2084 = 5", "two free expressions " + twoFree.variables.map(function (v) { return v.text; }).join("; "));
assertSystem(M([
  ["1", "-2", "1/2", "3", "4"],
  ["2", "-4", "1", "6", "8"],
  ["0", "0", "0", "1", "5"]
]), [
  m.parseEntry("-11"),
  m.parseEntry("0"),
  m.parseEntry("0"),
  m.parseEntry("5")
], "two free, parameters zero");
assertSystem(M([
  ["1", "-2", "1/2", "3", "4"],
  ["2", "-4", "1", "6", "8"],
  ["0", "0", "0", "1", "5"]
]), [
  m.parseEntry("-7"),
  m.parseEntry("3"),
  m.parseEntry("4"),
  m.parseEntry("5")
], "two free, t = 3 and s = 4");

var already = m.solve(M([
  ["1", "0", "4"],
  ["0", "1", "\u22122"]
]), { augmented: true });
assert(already.steps.length === 0 && already.status === "unique", "a matrix already in reduced form needs no steps");
assert(text(already).indexOf("No row operation is needed.") !== -1, "already reduced explanation");

var zeroAug = m.solve(M([
  ["0", "0"],
  ["0", "0"]
]), { augmented: true });
assert(zeroAug.status === "infinite" && zeroAug.rank === 0 && zeroAug.variables[0].text === "x\u2081 = t", "zero augmented system leaves the variable free");

var badAug = m.solve(M([
  ["0", "1"],
  ["0", "0"]
]), { augmented: true });
assert(badAug.status === "none" && text(badAug).indexOf("0 = 1") !== -1, "a lone nonzero constant is inconsistent");

assert(m.eq(m.parseEntry("2/4"), m.parseEntry("1/2")), "2/4 reduces");
assert(m.eq(m.parseEntry("3 / 4"), m.parseEntry("0.75")), "spaces and decimals agree");
assert(m.eq(m.parseEntry("\u22122/5"), m.parseEntry("-0.4")), "unicode minus in a fraction");

var samples = [unique, free, none, wide, frac, twoFree, already];
var joined = samples.map(text).join("\n");
assert(joined.indexOf("-") === -1 && joined.indexOf("\u2013") === -1 && joined.indexOf("\u2014") === -1, "step text has no hyphen, en dash, or em dash");

var htmlPath = path.join(__dirname, "../calculators/rref.html");
if (fs.existsSync(htmlPath)) {
  var html = fs.readFileSync(htmlPath, "utf8");
  var preMatch = html.match(/<pre id="worked-static"[^>]*>([\s\S]*?)<\/pre>/);
  assert(preMatch && preMatch[1] === text(unique), "static worked example matches the preloaded system");
  var visible = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  var dashAt = visible.search(/[-–—]/);
  assert(dashAt === -1, "visible page text has no hyphen or dash" + (dashAt === -1 ? "" : ": " + JSON.stringify(visible.slice(Math.max(0, dashAt - 40), dashAt + 40))));
  assert(html.indexOf("noindex") === -1 && html.indexOf("nofollow") === -1 && html.indexOf("noai") === -1 && html.indexOf("X-Robots-Tag") === -1, "page stays indexable");
  assert(html.indexOf("footer-note") === -1 && html.indexOf("All rights reserved") === -1, "calculator footer has no copyright line");
  assert(html.indexOf("Joshua Israel Ventures LLC") === -1, "calculator page does not name the LLC");
  assert(html.indexOf("beacon.min.js") !== -1 && html.indexOf("2a796980ec83472687c1d36c60177e23") !== -1, "analytics beacon is present");
  assert(html.indexOf("https://highermathguide.com/calculators/rref.html") !== -1, "canonical host is present");
  assert(html.indexOf("FAQPage") !== -1 && html.indexOf("WebApplication") !== -1, "FAQ and application structured data");
  assert(html.indexOf('"name": "Higher Math Guide"') !== -1, "publisher name is the site brand");
  var faqCount = (html.match(/"@type": "Question"/g) || []).length;
  assert(faqCount >= 4 && faqCount <= 6, "FAQ has 4 to 6 questions, got " + faqCount);
  ["calculators/index.html", "index.html", "calculators/matrix-2x2.html", "calculators/matrix-3x3.html", "topics/linear-algebra.html", "explainers/eigenvalues-plain-language.html", "llms.txt", "sitemap.xml"].forEach(function (rel) {
    var body = fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
    assert(body.indexOf("rref.html") !== -1, rel + " links to the calculator");
  });
  var sitemap = fs.readFileSync(path.join(__dirname, "../sitemap.xml"), "utf8");
  assert(sitemap.indexOf("<loc>https://highermathguide.com/calculators/rref.html</loc>\n    <lastmod>2026-10-25</lastmod>") !== -1, "sitemap lastmod matches the schema update");
  assert(fs.readFileSync(path.join(__dirname, "../robots.txt"), "utf8").indexOf("rref") === -1, "robots.txt is unchanged");
}

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("all rref checks passed");
