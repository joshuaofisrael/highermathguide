/* Hand checks for the normal distribution calculator.
 *
 * Published reference values (Abramowitz and Stegun / standard normal tables):
 *   Φ(0) = 0.5
 *   Φ(1.96) ≈ 0.9750021048517795
 *   Φ(1) ≈ 0.8413447460685429
 *   Φ(1) − Φ(−1) ≈ 0.6826894921370859
 *   Φ⁻¹(0.975) ≈ 1.959963984540054
 *
 * Worked model: X ~ N(100, 15²).
 *   P(85 < X < 115) = Φ(1) − Φ(−1) ≈ 0.6827
 *   P(X < 1.96) for a standard normal ≈ 0.9750
 *   The 97.5th percentile is x = 100 + 15 Φ⁻¹(0.975) ≈ 129.39946
 */
"use strict";

var fs = require("fs");
var path = require("path");
var m = require("../js/normal-cdf.js");
var failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL " + msg);
  } else {
    console.log("ok " + msg);
  }
}

function closeTo(actual, expected, tol, msg) {
  var ok = Math.abs(actual - expected) <= tol;
  assert(ok, msg + " got " + actual + " expected " + expected + " ± " + tol);
}

function throws(fn) {
  try {
    fn();
    return "";
  } catch (err) {
    return err && err.message ? err.message : "thrown";
  }
}

var PHI_196 = 0.9750021048517795;
var PHI_1 = 0.8413447460685429;
var MID_1SD = 0.6826894921370859;
var Z_975 = 1.959963984540054;

closeTo(m.normalCdf(0), 0.5, 1e-9, "Φ(0) is 1/2");
closeTo(m.normalCdf(1.96), PHI_196, 1.5e-7, "Φ(1.96) within the erf error bound");
closeTo(m.normalCdf(1), PHI_1, 1.5e-7, "Φ(1) within the erf error bound");
closeTo(m.normalCdf(-1.96), 1 - m.normalCdf(1.96), 1e-12, "Φ is symmetric");
closeTo(m.invNormalCdf(0.975), Z_975, 6e-5, "inverse of 0.975 near the published quantile");
closeTo(m.invNormalCdf(0.975), 1.9599116696974395, 1e-12, "inverse keeps the existing rational approximation");
assert(m.invNormalCdf(0.5) === 0, "inverse of 1/2 is 0");
assert(throws(function () { m.invNormalCdf(0); }).length > 0, "inverse rejects 0");
assert(throws(function () { m.invNormalCdf(1); }).length > 0, "inverse rejects 1");

[0.001, 0.025, 0.1, 0.5, 0.9, 0.975, 0.999].forEach(function (p) {
  closeTo(m.normalCdf(m.invNormalCdf(p)), p, 5e-6, "round trip cdf(inv(" + p + "))");
});
[-3, -1.96, -1, 0, 1, 1.96, 3].forEach(function (z) {
  closeTo(m.invNormalCdf(m.normalCdf(z)), z, 1e-4, "round trip inv(cdf(" + z + "))");
});

var mid = m.solve({ mode: "score", mu: 100, sigma: 15, range: "between", a: 85, b: 115 });
closeTo(mid.probability, MID_1SD, 2e-7, "P(85<X<115) for N(100, 15^2)");
closeTo(mid.za, -1, 1e-12, "lower z is -1");
closeTo(mid.zb, 1, 1e-12, "upper z is 1");
assert(Math.round(mid.probability * 1e4) / 1e4 === 0.6827, "P(85<X<115) rounds to 0.6827");
assert(mid.detail.indexOf("z = (x \u2212 \u03bc) / \u03c3") !== -1, "worked solution shows z = (x - mu) / sigma");
assert(mid.detail.indexOf("(85 \u2212 100) / 15 = \u22121") !== -1, "worked solution substitutes the lower bound");
assert(mid.detail.indexOf("(115 \u2212 100) / 15 = 1") !== -1, "worked solution substitutes the upper bound");
assert(mid.detail.indexOf("About 68.27%") !== -1, "plain language states about 68.27%");
assert(mid.amount.indexOf("P(85 < X < 115)") !== -1, "headline names the interval");

var std = m.solve({ mode: "cdf", z: "1.96" });
closeTo(std.probability, PHI_196, 1.5e-7, "standard normal P(Z ≤ 1.96)");
assert(Math.round(std.probability * 1e4) / 1e4 === 0.975, "Φ(1.96) rounds to 0.9750");
assert(std.detail.indexOf("About 97.50%") !== -1, "plain language for 1.96");
assert(std.detail.indexOf("left tail") !== -1, "z mode names the left tail");

var left = m.solve({ mode: "score", mu: 0, sigma: 1, range: "lt", b: 1.96 });
closeTo(left.probability, std.probability, 1e-15, "raw score P(X<1.96) matches Φ(1.96)");

var right = m.solve({ mode: "score", mu: 100, sigma: 15, range: "gt", a: 130 });
closeTo(right.za, 2, 1e-12, "z for 130 is 2");
closeTo(right.probability, 1 - m.normalCdf(2), 1e-15, "right tail is 1 - Φ(2)");
assert(right.detail.indexOf("1 \u2212") !== -1, "right tail shows 1 minus Φ");

var same = m.solve({ mode: "score", mu: 100, sigma: 15, range: "between", a: 100, b: 100 });
assert(same.probability === 0, "equal bounds have probability 0");

var invPct = m.solve({ mode: "inv", p: "97.5", mu: 0, sigma: 1 });
var invProb = m.solve({ mode: "inv", p: "0.975", mu: "0", sigma: "1" });
closeTo(invPct.z, invProb.z, 0, "97.5 and 0.975 are the same z");
closeTo(invPct.z, Z_975, 6e-5, "inverse standard normal near 1.96");
assert(Math.round(invPct.z * 100) / 100 === 1.96, "inverse of 0.975 rounds to 1.96");
assert(invPct.amount.indexOf("z ") === 0, "standard inverse headline is a z score");
assert(invPct.detail.indexOf("read as a percentage") !== -1, "97.5 is explained as a percentage");
assert(invProb.detail.indexOf("already a probability") !== -1, "0.975 is explained as a probability");

var invRaw = m.solve({ mode: "inv", p: 0.975, mu: 100, sigma: 15 });
closeTo(invRaw.x, 100 + 15 * invRaw.z, 1e-9, "raw cutoff is mu + z sigma");
closeTo(invRaw.x, 100 + 15 * Z_975, 0.001, "97.5th percentile of N(100, 15^2)");
assert(invRaw.amount.indexOf("x ") === 0, "raw inverse headline is an x score");
assert(invRaw.detail.indexOf("x = \u03bc + z\u03c3") !== -1, "inverse shows x = mu + z sigma");
assert(invRaw.x > 129.3 && invRaw.x < 129.4, "raw cutoff is a bit under 129.4");

assert(throws(function () {
  m.solve({ mode: "score", mu: 100, sigma: 0, range: "lt", b: 1 });
}) === "Standard deviation must be greater than 0.", "sigma 0 is rejected");
assert(throws(function () {
  m.solve({ mode: "score", mu: 100, sigma: -3, range: "lt", b: 1 });
}) === "Standard deviation must be greater than 0.", "negative sigma is rejected");
assert(throws(function () {
  m.solve({ mode: "score", mu: "", sigma: 15, range: "between", a: 85, b: 115 });
}) === "Enter a valid number for the mean.", "blank mean is rejected");
assert(throws(function () {
  m.solve({ mode: "score", mu: 100, sigma: 15, range: "between", a: 120, b: 110 });
}) === "The lower bound a must be less than the upper bound b.", "reversed bounds are rejected");
assert(throws(function () {
  m.solve({ mode: "inv", p: "100", mu: 0, sigma: 1 });
}) === "Enter a percentile in (0, 100) or a probability in (0, 1).", "percentile 100 is rejected");
assert(throws(function () {
  m.solve({ mode: "inv", p: "0", mu: 0, sigma: 1 });
}) === "Enter a percentile in (0, 100) or a probability in (0, 1).", "probability 0 is rejected");
assert(throws(function () {
  m.solve({ mode: "score", mu: 0, sigma: 1e-320, range: "lt", b: 1 });
}).indexOf("too large") !== -1, "overflowing z is rejected");

var half = m.solve({ mode: "score", mu: -10, sigma: 2, range: "lt", b: -10 });
closeTo(half.probability, 0.5, 1e-9, "left tail at the mean is about 1/2");

var root = path.join(__dirname, "..");
var html = fs.readFileSync(path.join(root, "calculators/normal-cdf.html"), "utf8");
assert(html.indexOf("<h1>Normal distribution calculator</h1>") !== -1, "H1 names the calculator");
assert(html.indexOf("Normal distribution calculator") !== -1, "breadcrumb name is present");
assert(html.indexOf('id="ncdf-mu"') !== -1 && html.indexOf('id="ncdf-sigma"') !== -1, "mean and standard deviation inputs");
assert(html.indexOf('value="between"') !== -1 && html.indexOf('value="lt"') !== -1 && html.indexOf('value="gt"') !== -1, "three range types");
assert(html.indexOf('value="cdf"') !== -1 && html.indexOf('value="inv"') !== -1, "z mode and inverse mode remain");
assert(html.indexOf("only knows the standard normal") === -1, "old limitation is gone");
assert(html.indexOf("aggregateRating") === -1 && html.indexOf("reviewCount") === -1, "no fake ratings");
assert(html.indexOf("BreadcrumbList") !== -1, "BreadcrumbList remains");
assert(html.indexOf("footer-note") === -1 && html.indexOf("All rights reserved") === -1, "calculator footer has no copyright line");
assert(html.indexOf("Joshua Israel Ventures LLC") === -1, "calculator page does not name the LLC");
assert(html.indexOf("beacon.min.js") !== -1 && html.indexOf("2a796980ec83472687c1d36c60177e23") !== -1, "Cloudflare beacon remains");
assert(html.indexOf("../js/normal-cdf.js") !== -1, "page loads the calculator script");
assert(html.indexOf("<label for=\"ncdf-mu\">Mean</label>") !== -1, "mean has a label");
assert(html.indexOf("<label for=\"ncdf-sigma\">Standard deviation</label>") !== -1, "standard deviation has a label");
assert(html.indexOf("type=\"submit\"") !== -1, "Enter submits the form");
assert(html.indexOf("role=\"alert\"") !== -1 && html.indexOf("aria-live=\"polite\"") !== -1, "errors and results are announced");
assert(html.indexOf("0.6827") !== -1 && html.indexOf("0.9750") !== -1, "worked examples quote the known values");
assert(html.indexOf("placement test") !== -1, "worked example is on the page");

var blocks = [];
var re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
var match;
while ((match = re.exec(html))) blocks.push(JSON.parse(match[1]));
var faq;
var app;
blocks.forEach(function (data) {
  var graph = data["@graph"] || [data];
  graph.forEach(function (node) {
    if (node["@type"] === "FAQPage") faq = node;
    if (node["@type"] === "WebApplication") app = node;
    if (node["@type"] === "BreadcrumbList") {
      var last = node.itemListElement[node.itemListElement.length - 1];
      assert(last.name === "Normal distribution calculator", "breadcrumb last name matches the H1");
    }
  });
});
assert(faq && faq.mainEntity.length === 5, "FAQ schema has five questions");
assert(app && app.description.indexOf("standard deviation") !== -1, "WebApplication description mentions standard deviation");
assert(app.description.indexOf("between two values") !== -1, "WebApplication description mentions an interval");
faq.mainEntity.forEach(function (q) {
  assert(html.indexOf("<h2>" + q.name + "</h2>") !== -1, "visible question: " + q.name);
  assert(html.indexOf("<p>" + q.acceptedAnswer.text + "</p>") !== -1, "visible answer matches schema: " + q.name);
});

var meta = html.match(/<meta name="description" content="([^"]*)"/);
assert(meta && meta[1].length >= 110 && meta[1].length <= 165, "meta description length is " + (meta ? meta[1].length : 0));
assert(html.indexOf('property="og:description" content="' + meta[1] + '"') !== -1, "Open Graph description matches");
assert(html.indexOf('name="twitter:description" content="' + meta[1] + '"') !== -1, "Twitter description matches");

var sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
assert(sitemap.indexOf("<loc>https://highermathguide.com/calculators/normal-cdf.html</loc>\n    <lastmod>2026-10-24</lastmod>") !== -1, "sitemap lastmod for the calculator");
assert(sitemap.indexOf("<loc>https://highermathguide.com/</loc>\n    <lastmod>2026-10-24</lastmod>") !== -1, "sitemap lastmod for the home page");
assert(sitemap.indexOf("<loc>https://highermathguide.com/calculators/</loc>\n    <lastmod>2026-10-24</lastmod>") !== -1, "sitemap lastmod for the calculator index");
assert(sitemap.indexOf("<loc>https://highermathguide.com/llms.txt</loc>\n    <lastmod>2026-10-24</lastmod>") !== -1, "sitemap lastmod for llms.txt");

var mainJs = fs.readFileSync(path.join(root, "js/main.js"), "utf8");
assert(mainJs.indexOf("function invNormalCdf") === -1, "main.js does not keep a second inverse");
assert(mainJs.indexOf("NormalCdf.solve") !== -1, "main.js calls the shared solver");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("all normal cdf checks passed");
