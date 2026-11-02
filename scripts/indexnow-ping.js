#!/usr/bin/env node
/**
 * IndexNow ping for highermathguide.com.
 *
 * Finds the IndexNow key file at the site root (a 32 character hex filename
 * whose contents are that same key), diffs the git range for this run to
 * find changed pages, and POSTs those URLs plus the sitemap to
 * https://api.indexnow.org/indexnow.
 *
 * Usage:
 *   node scripts/indexnow-ping.js [--dry-run]
 *
 * Range is read from INDEXNOW_BEFORE / INDEXNOW_AFTER (set by the deploy
 * workflow from github.event.before / github.sha) or from --before=/--after=
 * CLI flags. Defaults to HEAD~1..HEAD for a manual run. A missing or
 * all-zero "before" (new branch, shallow history) falls back to just the
 * sitemap so the ping still goes out.
 *
 * This is a best-effort SEO notification, not a publish gate: a network or
 * API failure is reported and the script still exits 0 so it never breaks
 * the deploy.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const ORIGIN = "https://highermathguide.com";
const ENDPOINT = "https://api.indexnow.org/indexnow";
const NOINDEX_PAGES = new Set(["404.html", "contact/thanks.html"]);
const ZERO_SHA = "0000000000000000000000000000000000000000";

function findKeyFile() {
  const entries = fs.readdirSync(ROOT, { withFileTypes: true });
  const match = entries.find((e) => e.isFile() && /^[0-9a-f]{32}\.txt$/.test(e.name));
  if (!match) throw new Error("no IndexNow key file (32 hex char .txt) found at the site root");
  const key = fs.readFileSync(path.join(ROOT, match.name), "utf8").trim();
  if (key !== match.name.replace(/\.txt$/, "")) {
    console.warn(`warning: ${match.name} contents do not match its filename`);
  }
  return { key, fileName: match.name };
}

function canonicalFor(fileRel) {
  if (fileRel === "index.html") return ORIGIN + "/";
  if (fileRel.endsWith("/index.html")) return ORIGIN + "/" + fileRel.slice(0, -"index.html".length);
  return ORIGIN + "/" + fileRel;
}

function flag(name) {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : null;
}

function changedHtmlUrls(before, after) {
  if (!before || before === ZERO_SHA) return [];
  try {
    const out = execSync(`git diff --name-only ${before} ${after}`, { cwd: ROOT, encoding: "utf8" });
    return out
      .split("\n")
      .map((l) => l.trim())
      .filter((f) => f.endsWith(".html"))
      .filter((f) => !f.startsWith("tests/"))
      .filter((f) => !NOINDEX_PAGES.has(f))
      .filter((f) => fs.existsSync(path.join(ROOT, f)))
      .map((f) => canonicalFor(f.split(path.sep).join("/")));
  } catch (err) {
    console.warn(`warning: git diff ${before}..${after} failed (${err.message}); submitting the sitemap only`);
    return [];
  }
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () => resolve({ status: res.statusCode, body: chunks }));
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const before = flag("before") || process.env.INDEXNOW_BEFORE || "HEAD~1";
  const after = flag("after") || process.env.INDEXNOW_AFTER || "HEAD";

  const { key, fileName } = findKeyFile();
  const host = new URL(ORIGIN).host;
  const keyLocation = `${ORIGIN}/${fileName}`;

  const urls = new Set([`${ORIGIN}/sitemap.xml`]);
  for (const url of changedHtmlUrls(before, after)) urls.add(url);
  const urlList = [...urls];

  const payload = { host, key, keyLocation, urlList };
  console.log(`IndexNow: ${urlList.length} url(s)`);
  urlList.forEach((u) => console.log(` - ${u}`));

  if (dryRun) {
    console.log("\n--dry-run set, not sending the request");
    return;
  }

  try {
    const res = await postJson(ENDPOINT, payload);
    console.log(`IndexNow responded ${res.status}`);
    if (res.body) console.log(res.body.slice(0, 500));
    if (res.status !== 200 && res.status !== 202) {
      console.warn(`warning: IndexNow did not return 200/202 (got ${res.status})`);
    }
  } catch (err) {
    console.warn(`warning: IndexNow request failed: ${err.message}`);
  }
}

main().catch((err) => {
  console.warn(`warning: IndexNow ping did not run: ${err.message}`);
});
