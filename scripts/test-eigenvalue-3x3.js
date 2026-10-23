/* Exact and numeric checks for the 3 by 3 eigenvalue calculator. */
"use strict";

var m = require("../js/eigenvalue-3x3.js");
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
    return row.map(function (entry) { return m.parseEntry(String(entry)); });
  });
}

function text(solved) {
  return solved.lines.join("\n");
}

function realGroups(solved) {
  return solved.groups.filter(function (g) { return g.real; });
}

function labels(solved) {
  return solved.groups.map(function (g) {
    return g.exact && g.real ? m.fmt(g.reRat) : g.re.toFixed(6) + (g.im ? "+" + g.im.toFixed(6) + "i" : "");
  });
}

function findReal(solved, value) {
  var target = m.parseEntry(String(value));
  var matches = solved.eigenspaces.filter(function (space) {
    return space.real && space.exact && m.eq(space.lambda, target);
  });
  assert(matches.length === 1, "found eigenvalue " + value + " in " + labels(solved).join(", "));
  return matches[0];
}

function parallel(got, expected) {
  var exp = expected.map(function (entry) { return m.parseEntry(String(entry)); });
  var minors = [
    m.parseEntry("0"),
    m.parseEntry("0"),
    m.parseEntry("0")
  ];
  function cross(a, b, i, j) {
    return a[i].n * b[j].d * a[i].d * b[j].d === 0n && false;
  }
  var z = true;
  for (var i = 0; i < 3; i++) {
    for (var j = i + 1; j < 3; j++) {
      var left = got[i].n * exp[j].n;
      var right = got[j].n * exp[i].n;
      var ld = got[i].d * exp[j].d;
      var rd = got[j].d * exp[i].d;
      if (left * rd !== right * ld) z = false;
    }
  }
  var nonzero = got.some(function (c) { return !m.isZero(c); });
  return z && nonzero;
}

function assertVector(space, expected, msg) {
  var hit = space.vectors.some(function (vec) {
    return vec.components && parallel(vec.components, expected);
  });
  assert(hit, msg + " got " + space.vectors.map(function (v) { return v.text; }).join(" ; "));
}

function assertChecked(solved, msg) {
  assert(solved.sumOk && solved.productOk, msg + " sum/product check");
}

var hero = m.solve(M([
  ["2", "0", "0"],
  ["0", "3", "4"],
  ["0", "4", "9"]
]));
assert(m.eq(hero.trace, m.parseEntry("14")), "hero trace 14, got " + m.fmt(hero.trace));
assert(m.eq(hero.sigma, m.parseEntry("35")), "hero principal minor sum 35, got " + m.fmt(hero.sigma));
assert(m.eq(hero.det, m.parseEntry("22")), "hero det 22, got " + m.fmt(hero.det));
assert(m.eq(hero.minors[0], m.parseEntry("11")), "hero M11 is 11");
assert(m.eq(hero.minors[1], m.parseEntry("18")), "hero M22 is 18");
assert(m.eq(hero.minors[2], m.parseEntry("6")), "hero M33 is 6");
assert(hero.polyDet.indexOf(m.MINUS + "\u03bb\u00b3") === 0, "hero det(A-λI) starts with -λ³: " + hero.polyDet);
["1", "2", "11"].forEach(function (value) {
  var space = findReal(hero, value);
  assert(space.algebraic === 1 && space.geometric === 1, "hero λ=" + value + " is simple");
  assert(space.vectors.length === 1 && space.vectors[0].verified, "hero λ=" + value + " eigenvector verified");
});
assertVector(findReal(hero, "1"), ["0", "2", "-1"], "hero eigenvector for 1");
assertVector(findReal(hero, "2"), ["1", "0", "0"], "hero eigenvector for 2");
assertVector(findReal(hero, "11"), ["0", "1", "2"], "hero eigenvector for 11");
assertChecked(hero, "hero");
assert(hero.diagonalizable, "hero is diagonalizable");
assert(text(hero).indexOf("Trace") !== -1 && text(hero).indexOf("35") !== -1, "hero steps show trace and principal sum");
assert(text(hero).indexOf("Sum of the eigenvalues") !== -1 || text(hero).indexOf("Sum of the eigenvalues = 14") !== -1, "hero sum check line");
assert(text(hero).indexOf("-") === -1 && text(hero).indexOf("\u2013") === -1 && text(hero).indexOf("\u2014") === -1, "hero steps have no hyphen or dash");

var diagonal = m.solve(M([
  ["1", "0", "0"],
  ["0", "2", "0"],
  ["0", "0", "3"]
]));
assertVector(findReal(diagonal, "1"), ["1", "0", "0"], "diagonal e1");
assertVector(findReal(diagonal, "2"), ["0", "1", "0"], "diagonal e2");
assertVector(findReal(diagonal, "3"), ["0", "0", "1"], "diagonal e3");
assert(diagonal.diagonalizable, "diagonal matrix is diagonalizable");
assertChecked(diagonal, "diagonal");

var triangular = m.solve(M([
  ["1", "4", "5"],
  ["0", "2", "6"],
  ["0", "0", "3"]
]));
["1", "2", "3"].forEach(function (value) {
  assert(findReal(triangular, value).vectors[0].verified, "triangular λ=" + value + " verified");
});
assertVector(findReal(triangular, "1"), ["1", "0", "0"], "triangular eigenvector for 1");
assertVector(findReal(triangular, "2"), ["4", "1", "0"], "triangular eigenvector for 2");
assertVector(findReal(triangular, "3"), ["29", "12", "2"], "triangular eigenvector for 3");
assert(m.eq(triangular.trace, m.parseEntry("6")), "triangular trace 6");
assert(m.eq(triangular.det, m.parseEntry("6")), "triangular det 6");
assertChecked(triangular, "triangular");

var repeated = m.solve(M([
  ["2", "1", "0"],
  ["0", "2", "0"],
  ["0", "0", "3"]
]));
var rep2 = findReal(repeated, "2");
assert(rep2.algebraic === 2 && rep2.geometric === 1, "repeated λ=2 has algebraic 2 and geometric 1, got " + rep2.algebraic + "/" + rep2.geometric);
assertVector(rep2, ["1", "0", "0"], "repeated eigenvector for 2");
assertVector(findReal(repeated, "3"), ["0", "0", "1"], "repeated eigenvector for 3");
assert(!repeated.diagonalizable, "Jordan block is not diagonalizable");
assert(text(repeated).indexOf("not diagonalizable") !== -1, "repeated steps say not diagonalizable");
assertChecked(repeated, "repeated");

var doublePlane = m.solve(M([
  ["2", "0", "0"],
  ["0", "2", "0"],
  ["0", "0", "5"]
]));
var plane = findReal(doublePlane, "2");
assert(plane.algebraic === 2 && plane.geometric === 2, "diagonalizable double eigenvalue has geometric 2");
assertVector(plane, ["1", "0", "0"], "plane basis vector e1");
assertVector(plane, ["0", "1", "0"], "plane basis vector e2");
assert(doublePlane.diagonalizable, "diagonal repeated eigenvalue is diagonalizable");
assertChecked(doublePlane, "double plane");

var complexPair = m.solve(M([
  ["0", "-1", "0"],
  ["1", "0", "0"],
  ["0", "0", "2"]
]));
assertVector(findReal(complexPair, "2"), ["0", "0", "1"], "rotation block eigenvector for 2");
var imag = complexPair.groups.filter(function (g) { return !g.real; });
assert(imag.length === 2, "rotation block has two nonreal eigenvalues, got " + imag.length);
assert(imag.every(function (g) { return g.exact; }), "±i are exact");
assert(Math.abs(Math.abs(imag[0].im) - 1) < 1e-12 && Math.abs(imag[0].re) < 1e-12, "nonreal roots are ±i");
assert(imag[0].im === -imag[1].im, "nonreal roots are conjugates");
assert(!complexPair.diagonalizable, "complex pair is not a real eigenbasis");
assert(text(complexPair).indexOf("no real eigenvector") !== -1, "complex steps mention no real eigenvector");
assertChecked(complexPair, "complex pair");

var fractionDiag = m.solve(M([
  ["1/2", "0", "0"],
  ["0", "1/3", "0"],
  ["0", "0", "1/6"]
]));
assert(m.eq(fractionDiag.trace, m.parseEntry("1")), "fraction trace is 1, got " + m.fmt(fractionDiag.trace));
assert(m.eq(fractionDiag.det, m.parseEntry("1/36")), "fraction det is 1/36, got " + m.fmt(fractionDiag.det));
assert(m.eq(fractionDiag.sigma, m.parseEntry("11/36")), "fraction sigma is 11/36, got " + m.fmt(fractionDiag.sigma));
["1/2", "1/3", "1/6"].forEach(function (value) {
  assert(findReal(fractionDiag, value).vectors[0].verified, "fraction λ=" + value + " verified");
});
assertChecked(fractionDiag, "fractions");

var decimals = m.solve(M([
  ["1.5", "0", "0"],
  ["0", "0.25", "0"],
  ["0", "0", "-2"]
]));
assert(m.eq(decimals.trace, m.parseEntry("-1/4")), "decimal trace -1/4, got " + m.fmt(decimals.trace));
["3/2", "1/4", "-2"].forEach(function (value) {
  assert(findReal(decimals, value).vectors[0].verified, "decimal λ=" + value + " verified");
});
assertChecked(decimals, "decimals");

var scaledRotation = m.solve(M([
  ["0", "-1/2", "0"],
  ["1/2", "0", "0"],
  ["0", "0", "1"]
]));
assertVector(findReal(scaledRotation, "1"), ["0", "0", "1"], "scaled rotation eigenvector");
var halfI = scaledRotation.groups.filter(function (g) { return !g.real; });
assert(halfI.length === 2 && halfI.every(function (g) { return g.exact; }), "±i/2 are exact");
assert(m.eq(m.parseEntry(String(Math.abs(halfI[0].im) === 0.5 ? "1/2" : "0")), m.parseEntry("0")) === false || Math.abs(Math.abs(halfI[0].im) - 0.5) < 1e-12, "imaginary part is 1/2");
assert(halfI[0].imRat && m.eq(m.parseEntry("1/2"), halfI[0].imRat.n < 0n ? { n: -halfI[0].imRat.n, d: halfI[0].imRat.d } : halfI[0].imRat), "exact imag 1/2");
assertChecked(scaledRotation, "scaled rotation");

var zero = m.solve(M([
  ["0", "0", "0"],
  ["0", "0", "0"],
  ["0", "0", "0"]
]));
var zspace = findReal(zero, "0");
assert(zspace.algebraic === 3 && zspace.geometric === 3, "zero matrix eigenvalue 0 has full eigenspace");
assert(zero.diagonalizable, "zero matrix is diagonalizable");
assertChecked(zero, "zero");

var identity = m.solve(M([
  ["1", "1", "0"],
  ["0", "1", "0"],
  ["0", "0", "1"]
]));
var idSpace = findReal(identity, "1");
assert(idSpace.algebraic === 3 && idSpace.geometric === 2, "shear identity has algebraic 3 and geometric 2, got " + idSpace.geometric);
assert(!identity.diagonalizable, "defective triple is not diagonalizable");
assertChecked(identity, "defective triple");

var negative = m.solve(M([
  ["-1", "0", "0"],
  ["0", "-2", "0"],
  ["0", "0", "4"]
]));
assertVector(findReal(negative, "-1"), ["1", "0", "0"], "negative eigenvector");
assertVector(findReal(negative, "-2"), ["0", "1", "0"], "negative eigenvector -2");
assertVector(findReal(negative, "4"), ["0", "0", "1"], "negative eigenvector 4");
assert(m.eq(negative.det, m.parseEntry("8")), "negative det 8");
assertChecked(negative, "negative diagonal");

var singular = m.solve(M([
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"]
]));
assert(m.eq(singular.det, m.parseEntry("0")), "dependent rows have det 0");
var zeroSpace = findReal(singular, "0");
assert(zeroSpace.vectors[0].verified, "zero eigenvalue of a singular matrix is verified");
assert(m.eq(m.matVec(M([
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"]
]), zeroSpace.vectors[0].components)[0], m.parseEntry("0")), "Av is zero for λ=0");
assertChecked(singular, "singular");
var other = realGroups(singular).filter(function (g) { return !(g.exact && m.eq(g.reRat, m.parseEntry("0"))); });
assert(other.length === 2 && other.every(function (g) { return !g.exact; }), "the other two singular eigenvalues are real and numeric");

function cos2(k) { return 2 * Math.cos(2 * Math.PI * k / 9); }
var cubic = m.solve(M([
  ["0", "1", "0"],
  ["0", "0", "1"],
  ["-1", "3", "0"]
]));
assert(m.eq(cubic.trace, m.parseEntry("0")), "irrational cubic trace 0");
assert(m.eq(cubic.det, m.parseEntry("-1")), "irrational cubic det -1, got " + m.fmt(cubic.det));
assert(realGroups(cubic).length === 3, "three real irrational eigenvalues");
assert(realGroups(cubic).every(function (g) { return !g.exact; }), "none of the cos roots is rational");
[1, 2, 4].forEach(function (k) {
  var target = cos2(k);
  var hit = cubic.groups.some(function (g) { return Math.abs(g.re - target) < 1e-8 && Math.abs(g.im) < 1e-8; });
  assert(hit, "cubic has root near " + target + " among " + cubic.groups.map(function (g) { return g.re; }).join(", "));
});
cubic.eigenspaces.forEach(function (space) {
  assert(space.vectors.length === 1 && space.vectors[0].verified, "numeric eigenvector residual ok for " + space.label);
  var v = space.vectors[0].components;
  var r = space.lambda;
  var expect = [1, r, r * r];
  var scale = v[0] === 0 ? 0 : expect[0] / v[0];
  var aligned = Math.abs(v[1] * scale - expect[1]) < 1e-6 && Math.abs(v[2] * scale - expect[2]) < 1e-6;
  assert(aligned, "companion eigenvector parallel to (1, λ, λ²) for " + space.label + " v=" + space.vectors[0].text);
});
assertChecked(cubic, "irrational cubic");
assert(text(cubic).indexOf("numeric") !== -1, "irrational steps say the roots are numeric");

var oneComplex = m.solve(M([
  ["0", "1", "0"],
  ["0", "0", "1"],
  ["-1", "-1", "0"]
]));
var realOne = oneComplex.groups.filter(function (g) { return g.real; });
var imagOne = oneComplex.groups.filter(function (g) { return !g.real; });
assert(realOne.length === 1 && imagOne.length === 2, "λ³ + λ + 1 has one real and two complex roots");
assert(Math.abs(imagOne[0].re - imagOne[1].re) < 1e-8, "complex pair shares a real part");
assert(Math.abs(imagOne[0].im + imagOne[1].im) < 1e-8, "complex pair has opposite imaginary parts");
assert(Math.abs(realOne[0].re + 0.682327803828) < 1e-8, "real root of λ³+λ+1 is about -0.6823278038, got " + realOne[0].re);
assert(oneComplex.eigenspaces.filter(function (s) { return s.real; })[0].vectors[0].verified, "real eigenvector of the complex cubic verifies");
assertChecked(oneComplex, "one real plus complex");

assert(m.eq(m.parseEntry(".5"), m.parseEntry("1/2")), ".5 is 1/2");
assert(m.eq(m.parseEntry("2/4"), m.parseEntry("1/2")), "2/4 reduces");
assert(m.eq(m.parseEntry("\u22122/5"), m.parseEntry("-0.4")), "unicode minus fraction");

var threw = false;
try { m.parseEntry("abc"); } catch (err) { threw = true; }
assert(threw, "letters are rejected");
threw = false;
try { m.parseEntry("1/0"); } catch (err) { threw = true; }
assert(threw, "zero denominator is rejected");
threw = false;
try { m.solve([[m.parseEntry("1")]]); } catch (err) { threw = true; }
assert(threw, "a short matrix is rejected");

var fs = require("fs");
var path = require("path");
var htmlPath = path.join(__dirname, "../calculators/eigenvalue-3x3.html");
if (fs.existsSync(htmlPath)) {
  var html = fs.readFileSync(htmlPath, "utf8");
  var preMatch = html.match(/<pre id="worked-static"[^>]*>([\s\S]*?)<\/pre>/);
  assert(preMatch && preMatch[1] === text(hero), "static worked example matches the hero matrix");
  assert(html.indexOf("joshuaofisrael") === -1, "calculator page does not expose the mailbox");
  assert(html.indexOf("eigenvalue-3x3.html") !== -1, "canonical mentions the page");
  assert(html.indexOf("FAQPage") !== -1 && html.indexOf("WebApplication") !== -1 && html.indexOf("BreadcrumbList") !== -1, "structured data types");
  assert(html.indexOf("beacon.min.js") !== -1 && html.indexOf("2a796980ec83472687c1d36c60177e23") !== -1, "analytics beacon");
  assert(html.indexOf("rref.html") !== -1 && html.indexOf("matrix-3x3.html") !== -1, "links out to rref and the 3 by 3 matrix calculator");
  assert(html.indexOf("3x3 eigenvalue calculator with steps") !== -1, "title or description targets the steps query");
  assert(html.indexOf("characteristic polynomial") !== -1, "page discusses the characteristic polynomial");
  var visible = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  assert(visible.indexOf("mailto:") === -1, "no mailto on the calculator page");
  ["calculators/eigenvalue-2x2.html", "calculators/index.html", "topics/linear-algebra.html", "explainers/eigenvalues-plain-language.html", "pathways/linear-algebra-first-course.html", "llms.txt", "sitemap.xml"].forEach(function (rel) {
    var body = fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
    assert(body.indexOf("eigenvalue-3x3.html") !== -1, rel + " links to the new calculator");
  });
}

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("all 3 by 3 eigenvalue checks passed");
