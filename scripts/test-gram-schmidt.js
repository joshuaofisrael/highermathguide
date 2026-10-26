/* Exact checks for the Gram Schmidt calculator. */
"use strict";

var gs = require("../js/gram-schmidt.js");
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

function V(rows) {
  return rows.map(function (row) {
    return row.map(function (entry) { return gs.parseEntry(entry); });
  });
}

function text(solved) {
  return solved.lines.join("\n");
}

var book = gs.process(V([
  ["1", "1", "0"],
  ["1", "0", "1"],
  ["0", "1", "1"]
]), { units: true });
assert(!book.dependent && book.independent === 3, "textbook triple is independent");
assert(gs.isZero(gs.dot(book.orthogonal[0], book.orthogonal[1])), "u1 perpendicular to u2");
assert(gs.isZero(gs.dot(book.orthogonal[0], book.orthogonal[2])), "u1 perpendicular to u3");
assert(gs.isZero(gs.dot(book.orthogonal[1], book.orthogonal[2])), "u2 perpendicular to u3");
assert(gs.eq(book.orthogonal[0][0], gs.parseEntry("1")) && gs.eq(book.orthogonal[1][0], gs.parseEntry("1/2")), "first two orthogonal entries");
assert(gs.eq(book.orthogonal[2][0], gs.parseEntry("-2/3")), "u3 first entry is -2/3");
assert(book.qr && book.qr.qRows[0][0] === "sqrt(2)/2", "Q11 is sqrt(2)/2");
assert(book.qr.rRows[2][2] === "2 sqrt(3)/3", "R33 is 2 sqrt(3)/3");
assert(text(book).indexOf("Check passed: Q times R rebuilds") !== -1, "QR rebuild is reported");

var plane = gs.process(V([
  ["3", "4"],
  ["-4", "3"]
]), { units: true });
assert(!plane.dependent, "perpendicular pair is independent");
assert(gs.eq(plane.units[0].coefs[0], gs.parseEntry("3/5")) && gs.eq(plane.units[0].coefs[1], gs.parseEntry("4/5")), "first unit vector is (3/5, 4/5)");
assert(gs.eq(plane.units[1].coefs[0], gs.parseEntry("-4/5")) && gs.eq(plane.units[1].coefs[1], gs.parseEntry("3/5")), "second unit vector is (-4/5, 3/5)");

var dependent = gs.process(V([
  ["1", "0"],
  ["2", "0"]
]), { units: true });
assert(dependent.dependent && dependent.qr === null, "dependent list has no QR");
assert(text(dependent).indexOf("linearly dependent") !== -1, "dependent explanation is present");

var hyphenWords = text(book) + "\n" + text(plane) + "\n" + text(dependent);
assert(hyphenWords.indexOf("-") === -1 && hyphenWords.indexOf("\u2013") === -1 && hyphenWords.indexOf("\u2014") === -1, "step text has no hyphen, en dash, or em dash");

var html = fs.readFileSync(path.join(__dirname, "../calculators/gram-schmidt.html"), "utf8");
var preMatch = html.match(/<pre id="worked-static"[^>]*>([\s\S]*?)<\/pre>/);
assert(preMatch && preMatch[1] === text(book), "static worked example matches the textbook triple");
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
assert(html.indexOf('"@type": "Person"') === -1, "no Person author");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("all Gram Schmidt checks passed");
