#!/usr/bin/env node
/**
 * Pre-publish legal hold gate for highermathguide.com.
 *
 * Run before GitHub Pages deploy. A failing gate exits 1 so the deploy
 * workflow does not upload a site artifact. There is no skip flag.
 *
 * Code-enforced (a failure blocks publish):
 *   3 MODERATE  Every file under images/, and every img src or srcset,
 *               has a non-placeholder file, source, licence, and notes
 *               entry in data/image-licences.json.
 *   4 MODERATE  Each blockquote or q element has an http(s) cite URL
 *               (cite attribute or an http(s) link inside the quote).
 *   5 MODERATE  These phrases fail unless the same sentence is a disclaimer
 *               (a negation before the phrase, or a question mark after it):
 *               "guaranteed return", "you should invest", "medical advice",
 *               "legal advice". An approval hash does not clear this.
 *   1 HIGH      fraud, scam, crook, convicted, or corrupt within 80
 *               characters of a title-case proper noun.
 *   2 HIGH      Phone numbers, street addresses other than the legal-page
 *               business address, and emails other than @highermathguide.com
 *               or a listed contact address. A street address here is a
 *               house number, a capitalized street name, and a capitalized
 *               suffix (Street, St, Lane, Ln). An all lowercase address is
 *               not matched.
 *   6 HIGH      "polling place", "registration deadline", or "voter eligibility".
 *   1, 2, 6, 7, 8 HIGH
 *               data/hold.json lists the page with status HOLD_REVIEW,
 *               unless data/approvals.json has that path and the sha256 of
 *               the exact file bytes. Any edit changes the hash.
 *
 * HIGH findings are dropped only when that exact file hash is approved.
 * MODERATE findings stay until the content is fixed.
 *
 * Judgement-only (the script does not decide these):
 *   1  Allegations that avoid the keyword list, all-caps names with no
 *      title-case word, and whether a nearby name is actually the subject.
 *   2  Sensitive facts that are not a phone, street address, or email
 *      (health, government IDs, account numbers, private messages, children).
 *   3  Whether a filled-in licence is true permission. The script checks
 *      that the four fields are written down and are not placeholders.
 *   4  Whether a cite URL was opened and supports the quote, and claims
 *      that are not inside a blockquote or q element.
 *   5  Personalised medical, legal, tax, or investment advice, and promised
 *      returns, that avoid the four phrases above.
 *   6  Election dates, winners, identification rules, and other logistics
 *      that avoid the three phrases above.
 *   7  Misleading presentation and implied endorsement. Record the page
 *      in data/hold.json when a person flags it.
 *   8  A complaint, embargo, or reporting restriction that arrives outside
 *      the repo. Record it in data/hold.json. The script cannot read an inbox.
 *
 * On failure the CLI prints each item and appends one JSON line per item to
 * hold-queue.jsonl (ts, site, bot, title, flagged, rule, sources, suggestion,
 * draft_path, status HOLD_REVIEW).
 */
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SITE = "highermathguide.com";
const ORIGIN = "https://highermathguide.com/";
const BOT = "Higher Level Math Education Bot";
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i;
const SKIP_DIRS = new Set([".git", "node_modules", "tests", ".github", "_site"]);

/**
 * Street address published on the legal pages, if one exists.
 * The legal pages do not currently publish a street address.
 * Add the exact address here when a legal page does. Matching text is allowed.
 * Any other street address fails rule 2.
 */
const BUSINESS_ADDRESSES = [];

/** Mailboxes the site may publish besides any @highermathguide.com address. */
const CONTACT_EMAILS = [];

const PLACEHOLDER = /^(?:unknown|todo|tbd|n\/a|na|none|unlicensed|\?+|tbc)$/i;
const NAME_WINDOW = 80;

const ADVICE_PHRASES = [
  { phrase: "guaranteed return", re: /guaranteed return/gi },
  { phrase: "you should invest", re: /you should invest/gi },
  { phrase: "medical advice", re: /medical advice/gi },
  { phrase: "legal advice", re: /legal advice/gi },
];

const ALLEGATION_WORDS = [
  { word: "fraud", re: /\bfraud\b/gi },
  { word: "scam", re: /\bscam\b/gi },
  { word: "crook", re: /\bcrook\b/gi },
  { word: "convicted", re: /\bconvicted\b/gi },
  { word: "corrupt", re: /\bcorrupt\b/gi },
];

const ELECTION_PHRASES = [
  { phrase: "polling place", re: /polling place/gi },
  { phrase: "registration deadline", re: /registration deadline/gi },
  { phrase: "voter eligibility", re: /voter eligibility/gi },
];

const PROPER_NOUN = /\b[A-Z][a-z]{2,}\b/g;

/** Title-case words that are not names of people or organisations. */
const NOT_PROPER = new Set([
  "The", "This", "That", "These", "Those", "There", "Their", "They", "Them",
  "Then", "Than", "With", "From", "Into", "Over", "After", "Before", "About",
  "Between", "Because", "While", "During", "Where", "What", "When", "Which",
  "Your", "You", "Our", "Not", "And", "But", "For", "Are", "Was", "Were",
  "Has", "Have", "Had", "Can", "May", "All", "Any", "Each", "Both", "Such",
  "Some", "One", "Two", "Also", "See", "Read", "Use", "Using", "Higher",
  "Math", "Guide", "Home", "Topics", "Explainers", "Calculators", "Glossary",
  "Pathways", "Sources", "Contact", "Privacy", "Terms", "Disclaimer",
  "Copyright", "Last", "Educational", "Original", "Free", "New", "Open",
  "Click", "Start", "Learn", "Study", "Page", "Site", "Note", "Notes", "Here",
  "Its", "How", "Why", "Who", "Whom", "Whose", "Let", "Suppose", "Consider",
  "Find", "Evaluate", "Compute", "Given", "Hence", "Thus", "Therefore",
  "Definition", "Theorem", "Proof", "Example", "Examples", "Exercise",
  "Exercises", "Chapter", "Section", "Figure", "Table", "Step", "Answer",
  "Question", "Calculator", "Calculus", "Algebra", "Probability", "Statistics",
  "Matrix", "Vector", "Limit", "Derivative", "Integral", "Series", "Sequence",
  "Function", "Functions", "Number", "Numbers", "Value", "Values", "Point",
  "Points", "Line", "Lines", "Plane", "Set", "Sets", "Field", "Group", "Ring",
  "Space", "Basis", "Span", "Kernel", "Image", "Rank", "Trace", "Eigenvalue",
  "Eigenvalues", "Eigenvector", "Polynomial", "Equation", "Equations",
  "Differential", "Partial", "Ordinary", "Real", "Complex", "Integer",
  "Rational", "Natural", "Positive", "Negative", "Continuous", "Differentiable",
  "Convergent", "Divergent", "Absolute", "Conditional", "Uniform", "Bounded",
  "Open", "Closed", "Compact", "Connected", "Finite", "Infinite", "Count",
  "Mean", "Variance", "Standard", "Normal", "Binomial", "Bayes", "Bayesian",
  "Prior", "Posterior", "Likelihood", "Sample", "Population", "Random",
  "Expected", "Conditional", "Independent", "Mutually", "Exclusive",
  "Higher", "Browser", "Students", "Student", "Course", "Courses", "Instructor",
  "Textbook", "Textbooks", "Further", "Reading", "Related", "Next", "Previous",
  "Back", "Welcome", "Published", "Reviewed", "Updated", "Effective", "State",
  "Florida", "United", "States", "Google", "Analytics", "Form", "Submit",
  "Cookie", "Cookies", "Accept", "Reject", "Privacy", "Policy", "Terms",
  "Copyright", "Disclaimer", "Contact", "About", "Faq", "Email", "Name",
  "Message", "Send", "Write", "Questions", "Nothing", "Accuracy", "Only",
  "Every", "Each", "Other", "Another", "Same", "Different", "Small", "Large",
  "First", "Second", "Third", "Left", "Right", "Above", "Below", "Inside",
  "Outside", "Without", "Within", "Across", "Along", "Among", "Under", "Upon",
  "Once", "Still", "Just", "Even", "Much", "Many", "More", "Most", "Less",
  "Least", "Very", "Too", "So", "No", "Yes", "True", "False", "Null",
]);

const PHONE_RE = /(?:\+\d{1,3}[\s.-])?(?:\(?\d{3}\)?[\s.-])\d{3}[\s.-]\d{4}\b/g;
// Capitalized street name plus a capitalized suffix, so a natural log "ln"
// or other math prose is not read as a lane.
const ADDRESS_RE = /\b\d{1,6}\s+(?:[A-Z][A-Za-z0-9.'’-]*\s+){1,4}(?:Street|Avenue|Road|Boulevard|Drive|Lane|Court|Place|Terrace|Circle|Parkway|St|Ave|Rd|Blvd|Dr|Ln|Way|Ct|Pl|Ter|Cir|Pkwy)\b\.?/g;
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const QUOTE_RE = /<(blockquote|q)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
const NEGATION_RE = /\b(?:not|no|never|without|neither|nor|isn'?t|aren'?t|wasn'?t|weren'?t|don'?t|doesn'?t|cannot|can'?t)\b/i;

const SUGGESTIONS = {
  "1": "Remove the allegation, or ask the owner to approve this exact file by recording its sha256 in data/approvals.json.",
  "2": "Remove the phone number, street address, or email. Addresses at highermathguide.com and the legal page business address are the exceptions. Anything else needs the owner's sha256 approval of this exact file.",
  "3": "Add file, source, licence, and notes to data/image-licences.json, or remove the image. Do not publish an image without a documented right.",
  "4": "Add an http or https cite URL on the quote, or remove the quote. A cite URL does not prove the source was opened.",
  "5": "Remove the advice or returns wording, or rewrite it as a clear disclaimer that this is not that advice. Fix the words. An approval hash does not clear this.",
  "6": "Remove the election logistics, or ask the owner to approve this exact file by recording its sha256 in data/approvals.json.",
  "7": "Ask the owner to approve this exact file by recording its sha256 in data/approvals.json. Do not publish while the hold stands.",
  "8": "Ask the owner to approve this exact file by recording its sha256 in data/approvals.json. Do not publish while the hold stands.",
  "1/2/6/8": "Ask the owner to approve this exact file by recording its sha256 in data/approvals.json. Do not publish while the hold stands.",
};

function posix(value) {
  return value.split(path.sep).join("/");
}

function repoRelative(root, file) {
  return posix(path.relative(root, file));
}

function hashBuffer(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function hashFile(file) {
  return hashBuffer(fs.readFileSync(file));
}

function walk(dir, out) {
  if (!out) out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function listHtml(root) {
  return walk(root)
    .filter((file) => file.endsWith(".html") || file.endsWith(".htm") || posix(repoRelative(root, file)) === "llms.txt")
    .sort();
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function phraseText(html) {
  const jsonLd = [];
  const ldRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = ldRe.exec(html))) jsonLd.push(match[1]);
  let body = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const extras = [];
  const attrRe = /\b(?:alt|title|content|aria-label)\s*=\s*(["'])([\s\S]*?)\1/gi;
  while ((match = attrRe.exec(body))) extras.push(match[2]);
  body = body.replace(/<[^>]+>/g, " ");
  return decodeEntities([body, extras.join(" "), jsonLd.join(" ")].join(" ")).replace(/\s+/g, " ").trim();
}

function pageTitle(html, rel) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return rel;
  const title = decodeEntities(match[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  return title || rel;
}

function snippet(text, index, length) {
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + (length || 24) + 40);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function disclaimerContext(text, index, phraseLength) {
  const before = text.slice(Math.max(0, index - 180), index);
  const sentenceStart = Math.max(before.lastIndexOf("."), before.lastIndexOf("!"), before.lastIndexOf("?"), before.lastIndexOf("\n"));
  const clause = sentenceStart >= 0 ? before.slice(sentenceStart + 1) : before;
  if (NEGATION_RE.test(clause)) return true;
  const after = text.slice(index + phraseLength, index + phraseLength + 48);
  return after.includes("?");
}

function properNounNear(text, index, length) {
  const window = text.slice(Math.max(0, index - NAME_WINDOW), Math.min(text.length, index + length + NAME_WINDOW));
  PROPER_NOUN.lastIndex = 0;
  let match;
  while ((match = PROPER_NOUN.exec(window))) {
    if (!NOT_PROPER.has(match[0])) return match[0];
  }
  return "";
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function loadLicences(root, findings) {
  const rel = "data/image-licences.json";
  const file = path.join(root, rel);
  const map = new Map();
  if (!fs.existsSync(file)) {
    findings.push({
      severity: "MODERATE",
      rule: "3",
      path: rel,
      message: "image licence record is missing",
      sources: [],
    });
    return map;
  }
  let parsed;
  try {
    parsed = loadJson(file);
  } catch (error) {
    findings.push({
      severity: "MODERATE",
      rule: "3",
      path: rel,
      message: `image licence record is not valid JSON (${error.message})`,
      sources: [],
    });
    return map;
  }
  const images = parsed && parsed.images;
  if (!Array.isArray(images)) {
    findings.push({
      severity: "MODERATE",
      rule: "3",
      path: rel,
      message: "image licence record needs an images array",
      sources: [],
    });
    return map;
  }
  for (const raw of images) {
    const entry = raw || {};
    const filePath = typeof entry.file === "string" ? posix(entry.file).replace(/^\.\//, "") : "";
    const source = typeof entry.source === "string" ? entry.source.trim() : "";
    const licence = typeof entry.licence === "string" ? entry.licence.trim() : "";
    const notes = typeof entry.notes === "string" ? entry.notes.trim() : "";
    if (!filePath || !source || !licence || !notes) {
      findings.push({
        severity: "MODERATE",
        rule: "3",
        path: filePath || rel,
        message: `licence entry is missing file, source, licence, or notes (${filePath || "no file"})`,
        sources: [],
      });
      continue;
    }
    if (map.has(filePath)) {
      findings.push({
        severity: "MODERATE",
        rule: "3",
        path: filePath,
        message: "licence entry is duplicated",
        sources: [],
      });
    }
    map.set(filePath, { file: filePath, source, licence, notes });
    if (PLACEHOLDER.test(source) || PLACEHOLDER.test(licence) || PLACEHOLDER.test(notes)) {
      findings.push({
        severity: "MODERATE",
        rule: "3",
        path: filePath,
        message: "licence entry uses a placeholder instead of documented provenance",
        sources: [],
      });
    }
  }
  return map;
}

function loadApprovals(root, findings) {
  const rel = "data/approvals.json";
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = loadJson(file);
    if (!parsed || !Array.isArray(parsed.approvals)) {
      findings.push({
        severity: "HIGH",
        rule: "1/2/6/8",
        path: rel,
        message: "approvals record needs an approvals array",
        sources: [],
      });
      return [];
    }
    return parsed.approvals
      .filter((entry) => entry && typeof entry.path === "string" && typeof entry.sha256 === "string")
      .map((entry) => ({
        path: posix(entry.path).replace(/^\.\//, ""),
        sha256: entry.sha256.trim().toLowerCase(),
      }));
  } catch (error) {
    findings.push({
      severity: "HIGH",
      rule: "1/2/6/8",
      path: rel,
      message: `approvals record is not valid JSON (${error.message})`,
      sources: [],
    });
    return [];
  }
}

function loadHolds(root, findings) {
  const rel = "data/hold.json";
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    findings.push({
      severity: "HIGH",
      rule: "8",
      path: rel,
      message: "content review manifest data/hold.json is missing",
      sources: [],
    });
    return [];
  }
  try {
    const parsed = loadJson(file);
    if (!parsed || !Array.isArray(parsed.pages)) {
      findings.push({
        severity: "HIGH",
        rule: "8",
        path: rel,
        message: "content review manifest needs a pages array",
        sources: [],
      });
      return [];
    }
    return parsed.pages.map((entry) => ({
      path: entry && typeof entry.path === "string" ? posix(entry.path).replace(/^\.\//, "") : "",
      status: entry && typeof entry.status === "string" ? entry.status.trim() : "",
      rule: entry && typeof entry.rule === "string" && entry.rule.trim() ? entry.rule.trim() : "1/2/6/8",
      title: entry && typeof entry.title === "string" ? entry.title.trim() : "",
    }));
  } catch (error) {
    findings.push({
      severity: "HIGH",
      rule: "8",
      path: rel,
      message: `content review manifest is not valid JSON (${error.message})`,
      sources: [],
    });
    return [];
  }
}

function isApproved(approvals, rel, file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  const hash = hashFile(file);
  return approvals.some((entry) => entry.path === rel && entry.sha256 === hash);
}

function listImageFiles(root) {
  const dir = path.join(root, "images");
  return walk(dir)
    .filter((file) => IMAGE_EXT.test(file))
    .map((file) => repoRelative(root, file));
}

function attr(tag, name) {
  const re = new RegExp("\\b" + name + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", "i");
  const match = tag.match(re);
  return match ? match[2].trim() : "";
}

function normalizeRef(raw, fromRel) {
  if (!raw) return "";
  let value = raw.trim();
  if (!value || value.startsWith("data:") || value.startsWith("mailto:") || value.startsWith("javascript:") || value.startsWith("#")) {
    return "";
  }
  value = value.split("#")[0].split("?")[0];
  if (/^https?:\/\//i.test(value)) {
    if (value.startsWith(ORIGIN)) return value.slice(ORIGIN.length).replace(/^\//, "");
    if (value.toLowerCase().startsWith("http://highermathguide.com/")) {
      return value.slice("http://highermathguide.com/".length).replace(/^\//, "");
    }
    return value;
  }
  if (value.startsWith("//")) return "https:" + value;
  if (value.startsWith("/")) return value.replace(/^\//, "");
  const dir = posix(path.dirname(fromRel));
  const base = dir === "." ? "" : dir + "/";
  const parts = (base + value).split("/");
  const stack = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

function referencedImages(html, fromRel) {
  const found = [];
  const imgRe = /<img\b[^>]*>/gi;
  let match;
  while ((match = imgRe.exec(html))) {
    const tag = match[0];
    const src = attr(tag, "src");
    if (src) found.push(normalizeRef(src, fromRel));
    const srcset = attr(tag, "srcset");
    if (srcset) {
      for (const part of srcset.split(",")) {
        const url = part.trim().split(/\s+/)[0];
        if (url) found.push(normalizeRef(url, fromRel));
      }
    }
  }
  return found.filter(Boolean);
}

function checkImages(root, htmlFiles, licences, findings) {
  const needed = new Set(listImageFiles(root));
  for (const file of htmlFiles) {
    if (!file.endsWith(".html") && !file.endsWith(".htm")) continue;
    const html = fs.readFileSync(file, "utf8");
    for (const image of referencedImages(html, repoRelative(root, file))) needed.add(image);
  }
  for (const image of needed) {
    if (licences.has(image)) continue;
    findings.push({
      severity: "MODERATE",
      rule: "3",
      path: image,
      message: "image has no file, source, licence, and notes entry in data/image-licences.json",
      sources: [],
    });
  }
}

function citeUrls(attrs, inner) {
  const urls = [];
  const citeRe = /\bcite\s*=\s*(["'])([\s\S]*?)\1/gi;
  let match;
  while ((match = citeRe.exec(attrs))) {
    const url = match[2].trim();
    if (/^https?:\/\//i.test(url)) urls.push(url);
  }
  const hrefRe = /\bhref\s*=\s*(["'])(https?:\/\/[^"']+)\1/gi;
  while ((match = hrefRe.exec(inner))) urls.push(match[2].trim());
  return urls;
}

function checkQuotes(rel, html, findings) {
  QUOTE_RE.lastIndex = 0;
  let match;
  while ((match = QUOTE_RE.exec(html))) {
    const urls = citeUrls(match[2], match[3]);
    if (urls.length > 0) continue;
    const visible = phraseText(match[3]).slice(0, 80);
    findings.push({
      severity: "MODERATE",
      rule: "4",
      path: rel,
      message: `quote block <${match[1]}> has no cite URL${visible ? ` ("${visible}")` : ""}`,
      sources: [],
    });
  }
}

function addPhraseFindings(rel, text, findings) {
  for (const item of ADVICE_PHRASES) {
    item.re.lastIndex = 0;
    let match;
    while ((match = item.re.exec(text))) {
      if (disclaimerContext(text, match.index, match[0].length)) continue;
      findings.push({
        severity: "MODERATE",
        rule: "5",
        path: rel,
        message: `advice or returns phrase "${item.phrase}" outside a disclaimer ("${snippet(text, match.index, match[0].length)}")`,
        sources: [],
      });
      break;
    }
  }
  for (const item of ALLEGATION_WORDS) {
    item.re.lastIndex = 0;
    let match;
    while ((match = item.re.exec(text))) {
      const name = properNounNear(text, match.index, match[0].length);
      if (!name) continue;
      findings.push({
        severity: "HIGH",
        rule: "1",
        path: rel,
        message: `allegation word "${item.word}" near proper noun ${name} ("${snippet(text, match.index, match[0].length)}")`,
        sources: [],
      });
      break;
    }
  }
  for (const item of ELECTION_PHRASES) {
    item.re.lastIndex = 0;
    const match = item.re.exec(text);
    if (!match) continue;
    findings.push({
      severity: "HIGH",
      rule: "6",
      path: rel,
      message: `election logistics phrase "${item.phrase}" ("${snippet(text, match.index, match[0].length)}")`,
      sources: [],
    });
  }
}

function addressKey(value) {
  return value.replace(/\s+/g, " ").replace(/\.$/, "").trim().toLowerCase();
}

function emailAllowed(email) {
  const lower = email.toLowerCase();
  if (CONTACT_EMAILS.some((item) => item.toLowerCase() === lower)) return true;
  const domain = lower.split("@")[1] || "";
  return domain === SITE;
}

function checkPersonalData(rel, text, findings) {
  PHONE_RE.lastIndex = 0;
  const phone = PHONE_RE.exec(text);
  if (phone) {
    findings.push({
      severity: "HIGH",
      rule: "2",
      path: rel,
      message: `phone number ("${phone[0]}")`,
      sources: [],
    });
  }
  ADDRESS_RE.lastIndex = 0;
  let address;
  while ((address = ADDRESS_RE.exec(text))) {
    const key = addressKey(address[0]);
    if (BUSINESS_ADDRESSES.some((item) => addressKey(item) === key)) continue;
    findings.push({
      severity: "HIGH",
      rule: "2",
      path: rel,
      message: `street address other than the legal page business address ("${address[0]}")`,
      sources: [],
    });
    break;
  }
  EMAIL_RE.lastIndex = 0;
  let email;
  while ((email = EMAIL_RE.exec(text))) {
    if (emailAllowed(email[0])) continue;
    findings.push({
      severity: "HIGH",
      rule: "2",
      path: rel,
      message: `email other than the site or contact address ("${email[0]}")`,
      sources: [],
    });
    break;
  }
}

function checkPage(root, file, findings) {
  const rel = repoRelative(root, file);
  const raw = fs.readFileSync(file, "utf8");
  const html = raw.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  if (file.endsWith(".html") || file.endsWith(".htm")) checkQuotes(rel, html, findings);
  const text = phraseText(raw);
  addPhraseFindings(rel, text, findings);
  checkPersonalData(rel, text, findings);
  return pageTitle(raw, rel);
}

function checkHolds(root, holds, findings, titles) {
  for (const hold of holds) {
    if (hold.status !== "HOLD_REVIEW") continue;
    if (!hold.path) {
      findings.push({
        severity: "HIGH",
        rule: hold.rule || "1/2/6/8",
        path: "data/hold.json",
        message: "HOLD_REVIEW entry is missing a path",
        sources: [],
      });
      continue;
    }
    const file = path.join(root, hold.path);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      findings.push({
        severity: "HIGH",
        rule: hold.rule || "1/2/6/8",
        path: hold.path,
        title: hold.title,
        message: "HOLD_REVIEW page is not a file in the site",
        sources: [],
      });
      continue;
    }
    const hash = hashFile(file);
    findings.push({
      severity: "HIGH",
      rule: hold.rule || "1/2/6/8",
      path: hold.path,
      title: hold.title || titles.get(hold.path) || hold.path,
      message: `status HOLD_REVIEW and data/approvals.json has no matching sha256 for this exact file (${hash})`,
      sources: [],
    });
  }
}

function dedupe(findings) {
  const unique = [];
  const seen = new Set();
  for (const finding of findings) {
    const key = [finding.severity, finding.rule, finding.path, finding.message].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(finding);
  }
  unique.sort((a, b) => a.path.localeCompare(b.path) || a.rule.localeCompare(b.rule) || a.message.localeCompare(b.message));
  return unique;
}

function applyApprovals(root, findings, approvals) {
  return findings.filter((finding) => {
    if (finding.severity !== "HIGH") return true;
    return !isApproved(approvals, finding.path, path.join(root, finding.path));
  });
}

function runLegalGate(options) {
  const settings = options || {};
  const root = path.resolve(settings.root || process.cwd());
  const findings = [];
  const licences = loadLicences(root, findings);
  const approvals = loadApprovals(root, findings);
  const holds = loadHolds(root, findings);
  const files = listHtml(root);
  const titles = new Map();
  checkImages(root, files, licences, findings);
  for (const file of files) {
    const rel = repoRelative(root, file);
    titles.set(rel, checkPage(root, file, findings));
  }
  checkHolds(root, holds, findings, titles);
  const resultFindings = applyApprovals(root, dedupe(findings), approvals);
  const result = { ok: resultFindings.length === 0, findings: resultFindings };
  if (settings.writeQueue) writeQueue(root, result.findings, titles, settings.queuePath);
  return result;
}

function writeQueue(root, findings, titles, queuePath) {
  if (!findings.length) return;
  const destination = queuePath ? path.resolve(queuePath) : path.join(root, "hold-queue.jsonl");
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const lines = findings.map((finding) => JSON.stringify({
    ts: new Date().toISOString(),
    site: SITE,
    bot: BOT,
    title: finding.title || (titles && titles.get(finding.path)) || finding.path,
    flagged: finding.message,
    rule: finding.rule,
    sources: finding.sources || [],
    suggestion: SUGGESTIONS[finding.rule] || SUGGESTIONS["1/2/6/8"],
    draft_path: finding.path,
    status: "HOLD_REVIEW",
  }));
  fs.appendFileSync(destination, lines.join("\n") + "\n");
}

function printReport(result) {
  if (result.ok) {
    console.log("legal-gate: pass");
    return;
  }
  console.error(`legal-gate: ${result.findings.length} finding(s)`);
  for (const finding of result.findings) {
    console.error(`${finding.severity} rule ${finding.rule} ${finding.path}: ${finding.message}`);
  }
}

function main() {
  const rootFlag = process.argv.indexOf("--root");
  const root = rootFlag >= 0 ? process.argv[rootFlag + 1] : undefined;
  const result = runLegalGate({ root, writeQueue: true });
  printReport(result);
  if (!result.ok) process.exit(1);
}

module.exports = {
  BUSINESS_ADDRESSES,
  CONTACT_EMAILS,
  SITE,
  BOT,
  disclaimerContext,
  hashFile,
  listHtml,
  repoRelative,
  runLegalGate,
};

if (require.main === module) main();
