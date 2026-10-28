#!/usr/bin/env node
/**
 * Technical SEO audit for the static site.
 * Crawls every href/src, checks canonicals, sitemap lastmod vs git, and JSON-LD.
 * Exit 0 when the checks in this file pass.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const ORIGIN = "https://highermathguide.com";
const LEGAL_FOOTER = "© 2026 Joshua Israel Ventures LLC. All rights reserved. Higher Math Guide is a trade name of Joshua Israel Ventures LLC, a Florida limited liability company.";
const RETIRED_FOOTER = "© 2026 Higher Math Guide. All rights reserved.";
const LEGAL_PAGES = new Set([
  "terms/index.html",
  "privacy/index.html",
  "disclaimer/index.html",
  "copyright/index.html",
  "contact/index.html",
  "contact/thanks.html",
]);
const NOINDEX_PAGES = new Set([
  "404.html",
  "contact/thanks.html",
]);
const GA_ID = "G-9MKRPRJMF5";
const GA_SRC = "https://www.googletagmanager.com/gtag/js?id=G-9MKRPRJMF5";
const ADSENSE_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5681559774142917";
const ADSENSE_META = '<meta name="google-adsense-account" content="ca-pub-5681559774142917">';
const BEACON = "<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{\"token\": \"2a796980ec83472687c1d36c60177e23\"}'></script><!-- End Cloudflare Web Analytics -->";

const SECTION = {
  topics: "Topics",
  explainers: "Explainers",
  glossary: "Glossary",
  pathways: "Pathways",
  calculators: "Calculators",
  about: "About",
  faq: "FAQ",
  contact: "Contact",
  sources: "Sources",
  terms: "Terms",
  privacy: "Privacy",
  disclaimer: "Disclaimer",
  copyright: "Copyright",
};

const failures = [];
function fail(msg) {
  failures.push(msg);
}

function walk(dir, acc) {
  for (const name of fs.readdirSync(dir)) {
    if (name === ".git" || name === "node_modules" || name === "tests" || name === ".github" || name === "_site") continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

function rel(full) {
  return path.relative(ROOT, full).split(path.sep).join("/");
}

function gitDate(fileRel, first) {
  try {
    const flag = first ? "" : "-1";
    const cmd = first
      ? `git log --follow --diff-filter=A --format=%cs -- "${fileRel}"`
      : `git log -1 --format=%cs -- "${fileRel}"`;
    const out = execSync(cmd, { cwd: ROOT, encoding: "utf8" }).trim();
    if (!out) return null;
    return first ? out.split("\n").filter(Boolean).pop() : out;
  } catch (err) {
    return null;
  }
}

function canonicalFor(fileRel) {
  if (fileRel === "index.html") return ORIGIN + "/";
  if (fileRel.endsWith("/index.html")) return ORIGIN + "/" + fileRel.slice(0, -"index.html".length);
  return ORIGIN + "/" + fileRel;
}

function fileForUrl(url) {
  let u = url.split("#")[0].split("?")[0];
  if (u.startsWith(ORIGIN)) u = u.slice(ORIGIN.length);
  if (!u.startsWith("/")) return null;
  if (u === "/") return "index.html";
  let p = u.replace(/^\//, "");
  if (p.endsWith("/")) p += "index.html";
  return p;
}

const allFiles = walk(ROOT, []).map(rel);
const htmlFiles = allFiles.filter((f) => f.endsWith(".html")).sort();

function read(fileRel) {
  return fs.readFileSync(path.join(ROOT, fileRel), "utf8");
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function h1Of(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return "";
  return stripTags(m[1]).replace(/\s+/g, " ").trim();
}

function metaContent(html, name) {
  const re = new RegExp(`<meta[^>]*name=["']${name}["'][^>]*>`, "i");
  const m = html.match(re);
  if (!m) return null;
  const c = m[0].match(/content=["']([^"']*)["']/i);
  return c ? c[1] : "";
}

function descriptionOf(html) {
  return metaContent(html, "description") || "";
}

function jsonBlocks(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const raw = m[1].trim();
    try {
      blocks.push({ ok: true, data: JSON.parse(raw), raw });
    } catch (err) {
      blocks.push({ ok: false, error: err.message, raw });
    }
  }
  return blocks;
}

function flattenTypes(node, acc) {
  if (!node || typeof node !== "object") return acc;
  if (Array.isArray(node)) {
    node.forEach((n) => flattenTypes(n, acc));
    return acc;
  }
  const t = node["@type"];
  if (typeof t === "string") acc.push({ type: t, node });
  else if (Array.isArray(t)) t.forEach((name) => acc.push({ type: name, node }));
  if (Array.isArray(node["@graph"])) node["@graph"].forEach((n) => flattenTypes(n, acc));
  return acc;
}

function visibleBreadcrumb(html) {
  const m = html.match(/<nav[^>]*aria-label=["']Breadcrumb["'][^>]*>([\s\S]*?)<\/nav>/i);
  if (!m) return null;
  const parts = [];
  const re = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>|<span[^>]*aria-current=["']page["'][^>]*>([\s\S]*?)<\/span>/gi;
  let x;
  while ((x = re.exec(m[1]))) {
    if (x[1]) parts.push({ href: x[1], name: stripTags(x[2]).replace(/\s+/g, " ").trim() });
    else parts.push({ href: null, name: stripTags(x[3]).replace(/\s+/g, " ").trim() });
  }
  return parts;
}

function resolveInternal(fromFile, raw) {
  if (!raw) return { skip: true, reason: "empty" };
  const href = raw.trim();
  if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:") || href.startsWith("data:")) {
    return { skip: true, reason: "non-file" };
  }
  if (href.startsWith("#")) return { internal: true, file: fromFile, fragment: href.slice(1), url: href };
  let base;
  if (href.startsWith(ORIGIN)) base = href.slice(ORIGIN.length);
  else if (/^https?:\/\//i.test(href)) return { skip: true, reason: "external", href };
  else if (href.startsWith("//")) return { skip: true, reason: "protocol-relative", href };
  else {
    const fromUrl = canonicalFor(fromFile);
    const abs = new URL(href, fromUrl);
    if (abs.origin !== ORIGIN) return { skip: true, reason: "external", href };
    base = abs.pathname + abs.search + abs.hash;
  }
  const hash = base.indexOf("#");
  const fragment = hash >= 0 ? decodeURIComponent(base.slice(hash + 1)) : "";
  const pathOnly = hash >= 0 ? base.slice(0, hash) : base;
  const q = pathOnly.indexOf("?");
  const clean = q >= 0 ? pathOnly.slice(0, q) : pathOnly;
  const file = fileForUrl(clean.startsWith("/") ? clean : "/" + clean);
  return { internal: true, file, fragment, url: href };
}

function idsIn(html) {
  const ids = new Set();
  const re = /\sid=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) ids.add(m[1]);
  return ids;
}

const MODE = process.argv[2] || "all";
const runLinks = MODE === "all" || MODE === "links";
const runTechnical = MODE === "all" || MODE === "technical";
const runJson = MODE === "all" || MODE === "jsonld";

const htmlByFile = new Map(htmlFiles.map((f) => [f, read(f)]));
const idCache = new Map();
function idsFor(file) {
  if (!idCache.has(file)) idCache.set(file, htmlByFile.has(file) ? idsIn(htmlByFile.get(file)) : new Set());
  return idCache.get(file);
}

let indexable = [];
if (runLinks) {
console.log("=== Link crawl ===");
const linkProblems = [];
const checked = { href: 0, src: 0, internal: 0 };
for (const file of htmlFiles) {
  const html = htmlByFile.get(file);
  const attrRe = /\s(?:href|src)=["']([^"']*)["']/gi;
  let m;
  while ((m = attrRe.exec(html))) {
    const attr = m[0].trim().startsWith("src") ? "src" : "href";
    checked[attr] += 1;
    const resolved = resolveInternal(file, m[1]);
    if (!resolved.internal) continue;
    checked.internal += 1;
    if (!resolved.file) {
      linkProblems.push(`${file} ${attr}="${m[1]}" did not resolve`);
      continue;
    }
    const target = path.join(ROOT, resolved.file);
    if (!fs.existsSync(target)) {
      linkProblems.push(`${file} ${attr}="${m[1]}" -> missing ${resolved.file}`);
      continue;
    }
    if (resolved.fragment && resolved.file.endsWith(".html") && !idsFor(resolved.file).has(resolved.fragment)) {
      linkProblems.push(`${file} ${attr}="${m[1]}" -> missing id #${resolved.fragment} in ${resolved.file}`);
    }
  }
}
const mdRe = /\[[^\]]+\]\(([^)]+)\)/g;
if (allFiles.includes("llms.txt")) {
  const text = read("llms.txt");
  let m;
  while ((m = mdRe.exec(text))) {
    const resolved = resolveInternal("llms.txt", m[1]);
    if (!resolved.internal) continue;
    checked.internal += 1;
    if (!resolved.file || !fs.existsSync(path.join(ROOT, resolved.file))) {
      linkProblems.push(`llms.txt -> missing ${m[1]}`);
    }
  }
}
if (linkProblems.length) {
  console.log(linkProblems.join("\n"));
  linkProblems.forEach(fail);
} else {
  console.log(`OK. href=${checked.href} src=${checked.src} internal targets=${checked.internal} broken=0`);
}
}

if (runTechnical) {
console.log("\n=== Canonical, viewport, lang, charset, indexability ===");
for (const file of htmlFiles) {
  const html = htmlByFile.get(file);
  const expected = canonicalFor(file);
  const cans = [...html.matchAll(/<link[^>]*rel=["']canonical["'][^>]*>/gi)].map((m) => {
    const h = m[0].match(/href=["']([^"']+)["']/i);
    return h ? h[1] : "";
  });
  const robotsMeta = html.match(/<meta[^>]*name=["']robots["'][^>]*>/i);
  const robotsContent = robotsMeta ? ((robotsMeta[0].match(/content=["']([^"']*)["']/i) || [])[1] || "") : "";
  if (NOINDEX_PAGES.has(file)) {
    if (robotsContent !== "noindex, follow") fail(`${file} must use meta robots noindex, follow`);
  } else if (/\bnoindex\b|\bnofollow\b|\bnoai\b|\bnoimageai\b/i.test(html)) {
    fail(`${file} has a robots restriction`);
  }
  if (cans.length !== 1) fail(`${file} canonical count ${cans.length}`);
  else if (cans[0] !== expected) fail(`${file} canonical ${cans[0]} expected ${expected}`);
  if (!/<html[^>]*\slang=["']en["']/i.test(html)) fail(`${file} missing lang=en`);
  if (!/<meta[^>]*charset=["']utf-8["']/i.test(html)) fail(`${file} missing charset`);
  if (!/<meta[^>]*name=["']viewport["'][^>]*content=["']width=device-width, initial-scale=1["']/i.test(html)) {
    fail(`${file} missing viewport`);
  }
  if (LEGAL_PAGES.has(file)) {
    const note = `<p class="footer-note">${LEGAL_FOOTER}</p>`;
    const notes = html.match(/<p class="footer-note">[\s\S]*?<\/p>/g) || [];
    if (notes.length !== 1 || notes[0] !== note) fail(`${file} footer text mismatch`);
    if (html.includes(RETIRED_FOOTER)) fail(`${file} footer still uses the brand copyright line`);
  } else if (html.includes("footer-note") || html.includes(RETIRED_FOOTER) || html.includes(LEGAL_FOOTER) || html.includes("All rights reserved") || html.includes("Joshua Israel Ventures LLC")) {
    fail(`${file} footer copyright line or LLC name on a non-legal page`);
  }
  const contentLeaf = /^(explainers|topics|calculators)\/[^/]+\.html$/.test(file) && !file.endsWith("/index.html");
  if (contentLeaf) {
    const bylines = [...html.matchAll(/<p class="byline">([^<]*)<\/p>/g)];
    if (bylines.length !== 1 || !bylines[0][1].startsWith("By the Higher Math Guide editorial team")) {
      fail(`${file} missing editorial byline`);
    } else {
      const reviewed = html.match(/<p>Last reviewed: ([^<]+)<\/p>/);
      const byline = bylines[0][1];
      if (reviewed && byline !== `By the Higher Math Guide editorial team. Last reviewed: ${reviewed[1]}`) {
        fail(`${file} byline does not include the existing Last reviewed date`);
      }
      if (!reviewed && byline !== "By the Higher Math Guide editorial team") {
        fail(`${file} byline adds a review date the page does not have`);
      }
    }
  }
  if (!html.includes(BEACON)) fail(`${file} analytics beacon mismatch`);
  const styles = [...html.matchAll(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi)].map((m) => {
    const href = m[0].match(/href=["']([^"']+)["']/i);
    return href ? href[1] : "";
  });
  const siteCss = styles.filter((href) => /(^|\/)css\/styles\.css$/.test(href));
  const katexCss = styles.filter((href) => href.indexOf("katex.min.css") !== -1);
  const otherCss = styles.filter((href) => siteCss.indexOf(href) === -1 && katexCss.indexOf(href) === -1);
  if (siteCss.length !== 1) fail(`${file} site stylesheet count ${siteCss.length}`);
  if (katexCss.length > 1) fail(`${file} duplicated KaTeX stylesheet`);
  if (otherCss.length) fail(`${file} unexpected stylesheet ${otherCss.join(", ")}`);
  if (/<style\b/i.test(html)) fail(`${file} has a page style block`);
  const blocking = [];
  let consentBootstraps = 0;
  const scriptRe = /<script\b([^>]*)>/gi;
  let sm;
  while ((sm = scriptRe.exec(html))) {
    const attrs = sm[1];
    const inHead = html.slice(0, sm.index).lastIndexOf("<head") > html.slice(0, sm.index).lastIndexOf("</head");
    if (!inHead) continue;
    if (/type=["']application\/ld\+json["']/i.test(attrs)) continue;
    if (/\bdefer\b/i.test(attrs) || /\basync\b/i.test(attrs) || /type=["']module["']/i.test(attrs)) continue;
    const close = html.indexOf("</script>", sm.index);
    const code = close > sm.index ? html.slice(sm.index + sm[0].length, close) : "";
    if (code.includes("/* hmg-consent */")) {
      consentBootstraps += 1;
      if (!code.includes(GA_ID) || !code.includes(GA_SRC) || !code.includes('signals("denied")') || !code.includes('"granted"') || !code.includes('consent", "update"')) {
        fail(`${file} consent bootstrap is missing Consent Mode or the measurement id`);
      }
      if (code.length > 2200) fail(`${file} consent bootstrap is ${code.length} characters`);
      continue;
    }
    blocking.push(attrs.trim() || "(inline)");
  }
  if (blocking.length) fail(`${file} render-blocking scripts: ${blocking.join(" | ")}`);
  if (consentBootstraps !== 1) fail(`${file} consent bootstrap count ${consentBootstraps}`);
  const uiAt = html.indexOf("/* hmg-consent-ui */");
  const headEnd = html.indexOf("</head>");
  if (uiAt < 0 || uiAt < headEnd) fail(`${file} consent banner script must sit after the head`);
  const adsenseAt = html.indexOf(ADSENSE_SRC);
  const consentAt = html.indexOf("/* hmg-consent */");
  if (adsenseAt < 0 || html.indexOf(ADSENSE_META) < 0) fail(`${file} AdSense head tags missing`);
  if (!(consentAt >= 0 && consentAt < adsenseAt)) fail(`${file} consent default must run before AdSense`);
  if (/<script\b[^>]*\bsrc=["']https:\/\/www\.googletagmanager\.com\/gtag\/js/i.test(html)) {
    fail(`${file} loads gtag.js before consent`);
  }
  const cookieLinks = html.match(/<a href="#cookie-settings" id="cookie-settings" class="js-cookie-settings">Cookie settings<\/a>/g) || [];
  if (cookieLinks.length !== 1) fail(`${file} Cookie settings link count ${cookieLinks.length}`);
  if (file === "privacy/index.html") {
    const visible = stripTags(html);
    if (!visible.includes("Google Analytics 4")) fail("privacy page does not name Google Analytics 4");
    if (!html.includes("https://tools.google.com/dlpage/gaoptout")) fail("privacy page missing analytics opt out link");
    if (!html.includes("https://policies.google.com/technologies/partner-sites")) fail("privacy page missing partner sites link");
    if (/\b(compliant|compliance|GDPR|CCPA)\b/i.test(visible)) fail("privacy page claims legal compliance");
  }
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)];
  imgs.forEach((im) => {
    const tag = im[0];
    if (!/\bwidth=/i.test(tag) || !/\bheight=/i.test(tag)) fail(`${file} img missing dimensions ${tag}`);
    const fold = html.indexOf("<main");
    const homeHero = file === "index.html" && /fetchpriority=["']high["']/i.test(tag);
    if (homeHero && /loading=["']lazy["']/i.test(tag)) fail(`${file} homepage hero must not be lazy`);
    if (im.index > fold && !/loading=["']lazy["']/i.test(tag) && !homeHero) fail(`${file} below-fold img not lazy ${tag}`);
  });
  if (!NOINDEX_PAGES.has(file)) indexable.push(file);
}
if (!failures.some((f) => /canonical|viewport|lang|charset|footer|byline|beacon|stylesheet|render-blocking|robots restriction|noindex|consent|AdSense|Cookie settings|gtag|partner sites|opt out|compliance/.test(f))) {
  console.log(`OK. ${htmlFiles.length} html files checked`);
}

console.log("\n=== Sitemap ===");
const sitemap = read("sitemap.xml");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)].map((m) => ({ loc: m[1], lastmod: m[2] }));
const expectedLocs = new Map();
for (const file of indexable) expectedLocs.set(canonicalFor(file), file);
if (fs.existsSync(path.join(ROOT, "llms.txt"))) expectedLocs.set(ORIGIN + "/llms.txt", "llms.txt");
const seen = new Map();
for (const row of locs) {
  if (seen.has(row.loc)) fail(`sitemap duplicate ${row.loc}`);
  seen.set(row.loc, row.lastmod);
  if (!expectedLocs.has(row.loc)) fail(`sitemap extra ${row.loc}`);
  else {
    const file = expectedLocs.get(row.loc);
    const git = gitDate(file, false);
    if (git && row.lastmod !== git) fail(`sitemap lastmod ${row.loc} is ${row.lastmod} git ${git}`);
  }
}
for (const [loc] of expectedLocs) {
  if (!seen.has(loc)) fail(`sitemap missing ${loc}`);
}
if (!failures.some((f) => f.startsWith("sitemap"))) console.log(`OK. ${locs.length} urls`);
}

if (runJson) {
console.log("\n=== JSON-LD ===");
const jsonReport = [];
for (const file of htmlFiles) {
  const html = htmlByFile.get(file);
  const blocks = jsonBlocks(html);
  const types = [];
  blocks.forEach((b, i) => {
    if (!b.ok) {
      fail(`${file} JSON-LD block ${i + 1} parse error: ${b.error}`);
      return;
    }
    flattenTypes(b.data, types);
  });
  const typeNames = types.map((t) => t.type);
  const crumbs = types.filter((t) => t.type === "BreadcrumbList");
  const articles = types.filter((t) => t.type === "Article" || t.type === "TechArticle");
  const apps = types.filter((t) => t.type === "WebApplication" || t.type === "SoftwareApplication");
  const faqs = types.filter((t) => t.type === "FAQPage");
  const orgs = types.filter((t) => t.type === "Organization");
  const sites = types.filter((t) => t.type === "WebSite");
  const visibleFaq = /class=["'][^"']*faq-item/.test(html);
  const expected = canonicalFor(file);
  const h1 = h1Of(html);
  const row = { file, types: typeNames, h1 };
  jsonReport.push(row);

  if (JSON.stringify(blocks).includes("SearchAction")) fail(`${file} has SearchAction`);

  if (crumbs.length !== 1) {
    fail(`${file} BreadcrumbList count ${crumbs.length}`);
  } else {
    const list = crumbs[0].node.itemListElement || [];
    const visible = visibleBreadcrumb(html);
    let expectTrail;
    if (visible) {
      expectTrail = visible.map((p, idx) => ({
        name: p.name,
        item: idx === visible.length - 1 ? expected : new URL(p.href, expected).href,
      }));
    } else if (file === "index.html") {
      expectTrail = [{ name: "Home", item: ORIGIN + "/" }];
    } else {
      const parts = file.split("/");
      const section = parts.length > 1 ? SECTION[parts[0]] : null;
      const sectionUrl = parts.length > 1 ? ORIGIN + "/" + parts[0] + "/" : null;
      const isHub = file.endsWith("/index.html");
      expectTrail = [{ name: "Home", item: ORIGIN + "/" }];
      if (section && isHub) expectTrail.push({ name: section, item: expected });
      else if (section) {
        expectTrail.push({ name: section, item: sectionUrl });
        expectTrail.push({ name: h1, item: expected });
      } else expectTrail.push({ name: h1, item: expected });
    }
    if (list.length !== expectTrail.length) {
      fail(`${file} breadcrumb length ${list.length} expected ${expectTrail.length}`);
    } else {
      list.forEach((item, idx) => {
        if (item["@type"] !== "ListItem") fail(`${file} breadcrumb ${idx} type`);
        if (item.position !== idx + 1) fail(`${file} breadcrumb position ${item.position}`);
        if (!item.name) fail(`${file} breadcrumb missing name at ${idx}`);
        if (item.item !== expectTrail[idx].item) fail(`${file} breadcrumb item ${item.item} expected ${expectTrail[idx].item}`);
        if (item.name !== expectTrail[idx].name) fail(`${file} breadcrumb name "${item.name}" expected "${expectTrail[idx].name}"`);
      });
    }
  }

  const topicLeaf = file.startsWith("topics/") && !file.endsWith("/index.html");
  const explainerLeaf = file.startsWith("explainers/") && !file.endsWith("/index.html");
  if (topicLeaf || explainerLeaf) {
    if (articles.length < 1) fail(`${file} missing Article`);
    articles.forEach((a) => {
      const n = a.node;
      if (!n.headline) fail(`${file} Article missing headline`);
      if (!n.dateModified || !/^\d{4}-\d{2}-\d{2}$/.test(n.dateModified)) fail(`${file} Article dateModified ${n.dateModified}`);
      const authorName = n.author && n.author.name;
      const authorType = n.author && n.author["@type"];
      const authorUrl = n.author && n.author.url;
      const publisherName = n.publisher && n.publisher.name;
      if (authorType !== "Organization") fail(`${file} Article author type ${authorType}`);
      if (authorName !== "Higher Math Guide") fail(`${file} Article author ${authorName}`);
      if (authorUrl !== "https://highermathguide.com/") fail(`${file} Article author url ${authorUrl}`);
      if (publisherName !== "Higher Math Guide") fail(`${file} Article publisher ${publisherName}`);
    });
  }
  if (file.startsWith("calculators/") && !file.endsWith("/index.html")) {
    if (apps.length < 1) fail(`${file} missing WebApplication`);
    apps.forEach((a) => {
      const author = a.node.author;
      const authorType = author && author["@type"];
      const authorName = author && author.name;
      const authorUrl = author && author.url;
      if (authorType !== "Organization" || authorName !== "Higher Math Guide" || authorUrl !== "https://highermathguide.com/") {
        fail(`${file} WebApplication author ${authorType} ${authorName} ${authorUrl}`);
      }
    });
  }
  if (typeNames.includes("Person")) fail(`${file} has Person schema`);
  if (file === "index.html") {
    if (!orgs.some((o) => o.node.name === "Higher Math Guide" && o.node.url === "https://highermathguide.com/")) fail("homepage missing Organization");
    if (sites.length < 1) fail("homepage missing WebSite");
  }
  faqs.forEach((f) => {
    if (!visibleFaq && file !== "index.html" && file !== "faq/index.html") {
      const looksFaq = /<h2[^>]*>[\s\S]*\?<\/h2>/i.test(html) || /faq/i.test(file);
      if (!looksFaq) fail(`${file} FAQPage without a visible FAQ`);
    }
    const main = f.node.mainEntity || [];
    if (!Array.isArray(main) || main.length === 0) fail(`${file} FAQPage empty`);
    main.forEach((q, i) => {
      if (!q.name) fail(`${file} FAQ question ${i} missing name`);
      const text = q.acceptedAnswer && q.acceptedAnswer.text;
      if (!text) fail(`${file} FAQ question ${i} missing answer`);
    });
  });
  if (visibleFaq && faqs.length === 0 && file !== "404.html") fail(`${file} visible FAQ without FAQPage`);
}

console.log(jsonReport.map((r) => `${r.file}: ${[...new Set(r.types)].join(", ")}`).join("\n"));
}

if (runTechnical) {
console.log("\n=== llms.txt coverage ===");
const llms = read("llms.txt");
const missingLlms = [];
for (const file of indexable) {
  if (file === "contact/thanks.html") continue;
  const url = canonicalFor(file);
  if (!llms.includes(url)) missingLlms.push(url);
}
if (missingLlms.length) {
  console.log(missingLlms.join("\n"));
  missingLlms.forEach((u) => fail(`llms.txt missing ${u}`));
} else console.log("OK. content urls are listed");

if (!fs.existsSync(path.join(ROOT, "404.html"))) fail("404.html missing");
const robots = read("robots.txt");
if (!robots.includes("Sitemap: https://highermathguide.com/sitemap.xml")) fail("robots.txt sitemap line");
if (/disallow:\s*\/\s*$/im.test(robots)) fail("robots.txt disallows all");
}

console.log("\n=== Summary ===");
if (failures.length) {
  console.log(`${failures.length} problems`);
  failures.forEach((f) => console.log(" - " + f));
  process.exit(1);
}
console.log("all audit checks passed");
