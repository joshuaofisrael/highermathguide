/* Exact checks for the LU decomposition calculator. */
"use strict";

var lu = require("../js/lu-decomposition.js");
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

function M(rows) {
  return rows.map(function (row) {
    return row.map(function (entry) { return lu.parseEntry(entry); });
  });
}

function B(entries) {
  return entries.map(function (entry) { return lu.parseEntry(entry); });
}

function rowText(matrix) {
  return matrix.map(function (row) { return row.map(lu.fmt).join(","); }).join("|");
}

function text(solved) {
  return solved.lines.join("\n");
}

var book = lu.factor(M([
  ["2", "1", "1"],
  ["4", "-6", "0"],
  ["-2", "7", "2"]
]), { pivot: false, b: B(["4", "-2", "7"]) });
function same(matrix, rows) {
  return matrix.every(function (row, i) {
    return row.every(function (entry, j) { return lu.eq(entry, lu.parseEntry(rows[i][j])); });
  });
}
assert(same(book.L, [["1", "0", "0"], ["2", "1", "0"], ["-1", "-1", "1"]]), "worked L, got " + rowText(book.L));
assert(same(book.U, [["2", "1", "1"], ["0", "-8", "-2"], ["0", "0", "1"]]), "worked U, got " + rowText(book.U));
assert(book.solution.map(lu.fmt).join(",") === "1,1,1", "worked solution is (1, 1, 1)");
assert(book.swaps === 0, "worked example has no row exchange");
assert(text(book).indexOf("Check passed. A times x equals b.") !== -1, "solution check is reported");

var swap = lu.factor(M([
  ["0", "1"],
  ["2", "3"]
]), { pivot: true, b: B(["1", "5"]) });
assert(swap.swaps === 1, "row exchange example swaps once");
assert(rowText(swap.P) === "0,1|1,0", "P is the exchange matrix");
assert(rowText(swap.L) === "1,0|0,1", "L is the identity after the exchange");
assert(rowText(swap.U) === "2,3|0,1", "U after the exchange, got " + rowText(swap.U));

var identity = lu.factor(M([
  ["1", "0"],
  ["0", "1"]
]), { pivot: false });
assert(rowText(identity.L) === "1,0|0,1" && rowText(identity.U) === "1,0|0,1", "identity factors as I and I");

var singularThrew = false;
try {
  lu.factor(M([
    ["1", "2"],
    ["2", "4"]
  ]), { pivot: false });
} catch (err) {
  singularThrew = /singular/i.test(err.message);
}
assert(singularThrew, "singular matrix is refused");

var zeroPivotThrew = false;
try {
  lu.factor(M([
    ["0", "1"],
    ["2", "3"]
  ]), { pivot: false });
} catch (err) {
  zeroPivotThrew = err.message.indexOf("Turn on partial pivoting") !== -1;
}
assert(zeroPivotThrew, "zero pivot without pivoting names the fix");

var hyphenWords = text(book) + "\n" + text(swap) + "\n" + text(identity);
assert(hyphenWords.indexOf("-") === -1 && hyphenWords.indexOf("\u2013") === -1 && hyphenWords.indexOf("\u2014") === -1, "step text has no hyphen, en dash, or em dash");

var html = fs.readFileSync(path.join(__dirname, "../calculators/lu-decomposition.html"), "utf8");
var preMatch = html.match(/<pre id="worked-static"[^>]*>([\s\S]*?)<\/pre>/);
assert(preMatch && preMatch[1] === text(book), "static worked example matches the solved system");
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
assert(html.indexOf("pivotEl") === -1 && html.indexOf('id="lu-pivot"') !== -1, "row exchanges use the select");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("all LU checks passed");
