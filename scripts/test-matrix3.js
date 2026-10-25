/* Exact checks for the 3 by 3 determinant and inverse. */
"use strict";

var m = require("../js/matrix3-exact.js");
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

function eqRat(a, b) {
  return m.eq(a, b);
}

function text(solved) {
  return solved.lines.join("\n");
}

var fractions = m.solve(M([
  ["1/2", "1", "0"],
  ["0", "1/3", "1"],
  ["1", "0", "1/4"]
]));
assert(eqRat(fractions.det, m.parseEntry("25/24")), "fraction matrix det is 25/24, got " + m.fmt(fractions.det));
assert(fractions.inverse && m.isIdentity(fractions.product), "fraction matrix: A times inverse is I");
assert(eqRat(fractions.minors[0][0], m.parseEntry("1/12")), "fraction M11 is 1/12");
assert(eqRat(fractions.cofactors[0][1], m.parseEntry("1")), "fraction C12 is 1");
assert(eqRat(fractions.inverse[0][0], m.parseEntry("2/25")), "fraction inverse 11 is 2/25");
assert(eqRat(fractions.inverse[0][1], m.parseEntry("-6/25")), "fraction inverse 12 is -6/25");
assert(eqRat(fractions.inverse[0][2], m.parseEntry("24/25")), "fraction inverse 13 is 24/25");
assert(eqRat(fractions.inverse[1][0], m.parseEntry("24/25")), "fraction inverse 21 is 24/25");
assert(eqRat(fractions.inverse[1][1], m.parseEntry("3/25")), "fraction inverse 22 is 3/25");
assert(eqRat(fractions.inverse[1][2], m.parseEntry("-12/25")), "fraction inverse 23 is -12/25");
assert(eqRat(fractions.inverse[2][0], m.parseEntry("-8/25")), "fraction inverse 31 is -8/25");
assert(eqRat(fractions.inverse[2][1], m.parseEntry("24/25")), "fraction inverse 32 is 24/25");
assert(eqRat(fractions.inverse[2][2], m.parseEntry("4/25")), "fraction inverse 33 is 4/25");
assert(text(fractions).indexOf("2 by 2") !== -1, "fraction steps write the 2 by 2 minors");
assert(fractions.rank === 3, "fraction rank is 3");

var singular = m.solve(M([
  ["1", "2", "3"],
  ["2", "4", "6"],
  ["0", "1", "1"]
]));
assert(eqRat(singular.det, m.parseEntry("0")), "singular det is 0");
assert(singular.inverse === null && singular.product === null, "singular matrix has no inverse");
assert(singular.rank === 2, "singular rank is 2, got " + singular.rank);
assert(text(singular).indexOf("singular and has no inverse") !== -1, "singular explanation is present");
assert(text(singular).indexOf("The product is the identity") === -1, "singular steps do not claim an identity product");

var negatives = m.solve(M([
  ["-2", "1", "3"],
  ["1", "-1", "0"],
  ["4", "2", "-1"]
]));
assert(eqRat(negatives.det, m.parseEntry("17")), "negative matrix det is 17, got " + m.fmt(negatives.det));
assert(m.isIdentity(negatives.product), "negative matrix: A times inverse is I");
assert(eqRat(negatives.inverse[0][0], m.parseEntry("1/17")), "negative inverse 11 is 1/17");
assert(eqRat(negatives.inverse[0][1], m.parseEntry("7/17")), "negative inverse 12 is 7/17");
assert(eqRat(negatives.inverse[0][2], m.parseEntry("3/17")), "negative inverse 13 is 3/17");
assert(eqRat(negatives.inverse[1][0], m.parseEntry("1/17")), "negative inverse 21 is 1/17");
assert(eqRat(negatives.inverse[1][1], m.parseEntry("-10/17")), "negative inverse 22 is -10/17");
assert(eqRat(negatives.inverse[1][2], m.parseEntry("3/17")), "negative inverse 23 is 3/17");
assert(eqRat(negatives.inverse[2][0], m.parseEntry("6/17")), "negative inverse 31 is 6/17");
assert(eqRat(negatives.inverse[2][1], m.parseEntry("8/17")), "negative inverse 32 is 8/17");
assert(eqRat(negatives.inverse[2][2], m.parseEntry("1/17")), "negative inverse 33 is 1/17");

var defaults = m.solve(M([
  ["1", "2", "3"],
  ["0", "1", "4"],
  ["5", "6", "0"]
]));
assert(eqRat(defaults.det, m.parseEntry("1")), "default det is 1");
assert(m.isIdentity(defaults.product), "default: A times inverse is I");
assert(eqRat(defaults.inverse[0][0], m.parseEntry("-24")), "default inverse row 1 column 1 is -24");
assert(eqRat(defaults.inverse[0][1], m.parseEntry("18")), "default inverse row 1 column 2 is 18");
assert(eqRat(defaults.inverse[0][2], m.parseEntry("5")), "default inverse row 1 column 3 is 5");
assert(eqRat(defaults.inverse[1][0], m.parseEntry("20")), "default inverse row 2 column 1 is 20");
assert(eqRat(defaults.inverse[1][1], m.parseEntry("-15")), "default inverse row 2 column 2 is -15");
assert(eqRat(defaults.inverse[1][2], m.parseEntry("-4")), "default inverse row 2 column 3 is -4");
assert(eqRat(defaults.inverse[2][0], m.parseEntry("-5")), "default inverse row 3 column 1 is -5");
assert(eqRat(defaults.inverse[2][1], m.parseEntry("4")), "default inverse row 3 column 2 is 4");
assert(eqRat(defaults.inverse[2][2], m.parseEntry("1")), "default inverse row 3 column 3 is 1");
assert(eqRat(defaults.minors[1][0], m.parseEntry("-18")), "default M21 is -18");
assert(eqRat(defaults.cofactors[2][1], m.parseEntry("-4")), "default C32 is -4");

var decimals = m.solve(M([
  ["0.5", "0", "0"],
  ["0", "2", "0"],
  ["0", "0", "-4"]
]));
assert(eqRat(decimals.det, m.parseEntry("-4")), "decimal diagonal det is -4, got " + m.fmt(decimals.det));
assert(m.isIdentity(decimals.product), "decimal matrix: A times inverse is I");
assert(eqRat(decimals.inverse[0][0], m.parseEntry("2")), "0.5 inverts to 2");
assert(eqRat(decimals.inverse[2][2], m.parseEntry("-1/4")), "decimal -4 inverts to -1/4");

assert(eqRat(m.parseEntry(".5"), m.parseEntry("1/2")), ".5 is 1/2");
assert(eqRat(m.parseEntry("1.25"), m.parseEntry("5/4")), "1.25 is 5/4");
assert(eqRat(m.parseEntry("-3/4"), m.parseEntry("-0.75")), "-3/4 equals -0.75");
assert(eqRat(m.parseEntry("2/4"), m.parseEntry("1/2")), "2/4 reduces to 1/2");
assert(eqRat(m.parseEntry("3 / 4"), m.parseEntry("3/4")), "spaces around a slash are ignored");

var rank1 = m.solve(M([
  ["1", "2", "3"],
  ["2", "4", "6"],
  ["3", "6", "9"]
]));
assert(eqRat(rank1.det, m.parseEntry("0")) && rank1.rank === 1, "rank 1 singular matrix");

var zero = m.solve(M([
  ["0", "0", "0"],
  ["0", "0", "0"],
  ["0", "0", "0"]
]));
assert(zero.singular && zero.rank === 0, "zero matrix has rank 0");

var hyphenWords = text(defaults) + "\n" + text(fractions) + "\n" + text(singular) + "\n" + text(negatives);
assert(hyphenWords.indexOf("-") === -1 && hyphenWords.indexOf("\u2013") === -1 && hyphenWords.indexOf("\u2014") === -1, "step text has no hyphen, en dash, or em dash");

var fs = require("fs");
var html = fs.readFileSync(require("path").join(__dirname, "../calculators/matrix-3x3.html"), "utf8");
var preMatch = html.match(/<pre id="worked-static"[^>]*>([\s\S]*?)<\/pre>/);
assert(preMatch && preMatch[1] === text(defaults), "static worked example matches the default matrix steps");
var visible = html
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");
var dashAt = visible.search(/[-–—]/);
assert(dashAt === -1, "visible page text has no hyphen or dash" + (dashAt === -1 ? "" : ": " + JSON.stringify(visible.slice(Math.max(0, dashAt - 40), dashAt + 40))));
assert(html.indexOf("noindex") === -1 && html.indexOf("nofollow") === -1 && html.indexOf("noai") === -1, "page stays indexable");
assert(html.indexOf("footer-note") === -1 && html.indexOf("All rights reserved") === -1, "calculator footer has no copyright line");
assert(html.indexOf("Joshua Israel Ventures LLC") === -1, "calculator page does not name the LLC");
assert(html.indexOf("beacon.min.js") !== -1 && html.indexOf("2a796980ec83472687c1d36c60177e23") !== -1, "analytics beacon is present");
assert(html.indexOf("Michigan") === -1, "no Michigan mention");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("all matrix 3 by 3 checks passed");
