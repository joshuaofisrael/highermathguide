"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { describe, it } = require("node:test");
const { BUSINESS_ADDRESSES, hashFile, listHtml, repoRelative, runLegalGate } = require("../scripts/legal-gate.js");

const REPO = path.join(__dirname, "..");
const FIXTURES = path.join(__dirname, "fixtures", "legal-gate");

const EMPTY_LICENCES = `${JSON.stringify({ images: [] }, null, 2)}\n`;
const EMPTY_HOLDS = `${JSON.stringify({ pages: [] }, null, 2)}\n`;
const EMPTY_APPROVALS = `${JSON.stringify({ approvals: [] }, null, 2)}\n`;

function withSite(files, run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "legal-gate-"));
  try {
    const all = Object.assign({
      "data/image-licences.json": EMPTY_LICENCES,
      "data/hold.json": EMPTY_HOLDS,
      "data/approvals.json": EMPTY_APPROVALS,
    }, files);
    for (const [rel, body] of Object.entries(all)) {
      const full = path.join(root, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, body);
    }
    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function rules(root) {
  return runLegalGate({ root }).findings.map((finding) => finding.rule);
}

describe("legal hold gate", () => {
  it("holds a page that says Acme Corp committed fraud and uses an unlicensed image", () => {
    const result = runLegalGate({ root: path.join(FIXTURES, "hold") });
    assert.equal(result.ok, false);
    assert.ok(result.findings.some((finding) => finding.rule === "1" && finding.severity === "HIGH" && /Acme/.test(finding.message)));
    assert.ok(result.findings.some((finding) => finding.rule === "3" && finding.path === "images/unlicensed.png"));
  });

  it("passes a licensed page whose advice wording is a disclaimer and whose quote has a cite URL", () => {
    const result = runLegalGate({ root: path.join(FIXTURES, "pass") });
    assert.deepEqual(result.findings, []);
    assert.equal(result.ok, true);
  });

  it("keeps fixture pages out of the published site scan", () => {
    const files = listHtml(REPO).map((file) => repoRelative(REPO, file));
    assert.equal(files.some((file) => file.startsWith("tests/") || file.includes("legal-gate")), false);
    assert.equal(fs.existsSync(path.join(FIXTURES, "hold", "index.html")), true);
  });

  it("passes the real site", () => {
    const result = runLegalGate({ root: REPO });
    assert.deepEqual(
      result.findings,
      [],
      result.findings.map((finding) => `${finding.rule} ${finding.path}: ${finding.message}`).join("\n"),
    );
  });

  it("writes a hold queue line for each failure", () => {
    const queue = path.join(os.tmpdir(), `hold-queue-${process.pid}.jsonl`);
    fs.rmSync(queue, { force: true });
    const result = runLegalGate({
      root: path.join(FIXTURES, "hold"),
      writeQueue: true,
      queuePath: queue,
    });
    assert.equal(result.ok, false);
    const lines = fs.readFileSync(queue, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    fs.rmSync(queue, { force: true });
    assert.equal(lines.length, result.findings.length);
    for (const line of lines) {
      assert.equal(line.site, "highermathguide.com");
      assert.equal(line.bot, "Higher Level Math Education Bot");
      assert.equal(line.status, "HOLD_REVIEW");
      assert.equal(typeof line.ts, "string");
      assert.equal(typeof line.title, "string");
      assert.equal(typeof line.flagged, "string");
      assert.equal(typeof line.rule, "string");
      assert.ok(Array.isArray(line.sources));
      assert.equal(typeof line.suggestion, "string");
      assert.equal(typeof line.draft_path, "string");
    }
    assert.ok(lines.some((line) => line.rule === "1" && line.title === "Hold fixture"));
    assert.ok(lines.some((line) => line.rule === "3" && line.draft_path === "images/unlicensed.png"));
  });

  it("fails HOLD_REVIEW unless the sha256 matches the exact file", () => {
    const rel = "notes/index.html";
    const body = "<!DOCTYPE html><html><head><title>Held note</title></head><body><p>A calculus note with no allegation.</p></body></html>\n";
    withSite(
      {
        [rel]: body,
        "data/hold.json": `${JSON.stringify({ pages: [{ path: rel, status: "HOLD_REVIEW", rule: "8", title: "Held note" }] }, null, 2)}\n`,
      },
      (root) => {
        const blocked = runLegalGate({ root });
        assert.equal(blocked.ok, false);
        assert.ok(blocked.findings.some((finding) => finding.rule === "8" && finding.severity === "HIGH"));

        const hash = hashFile(path.join(root, rel));
        fs.writeFileSync(
          path.join(root, "data/approvals.json"),
          `${JSON.stringify({ approvals: [{ path: rel, sha256: hash }] }, null, 2)}\n`,
        );
        assert.deepEqual(runLegalGate({ root }).findings, []);

        fs.writeFileSync(path.join(root, rel), `${body}<p>Edited.</p>\n`);
        const changed = runLegalGate({ root });
        assert.equal(changed.ok, false);
        assert.ok(changed.findings.some((finding) => finding.rule === "8"));
      },
    );
  });

  it("does not let an approval hash clear an unlicensed image or a quote without a cite", () => {
    const rel = "notes/index.html";
    const body = "<!DOCTYPE html><html><head><title>Mixed</title></head><body><blockquote><p>A quote with no source.</p></blockquote><img src=\"images/blank.png\" alt=\"Blank\"></body></html>\n";
    withSite(
      {
        [rel]: body,
        "images/blank.png": "png",
      },
      (root) => {
        const hash = hashFile(path.join(root, rel));
        fs.writeFileSync(
          path.join(root, "data/approvals.json"),
          `${JSON.stringify({ approvals: [{ path: rel, sha256: hash }] }, null, 2)}\n`,
        );
        const result = runLegalGate({ root });
        assert.equal(result.ok, false);
        assert.ok(result.findings.some((finding) => finding.rule === "3"));
        assert.ok(result.findings.some((finding) => finding.rule === "4"));
        assert.equal(result.findings.some((finding) => finding.severity === "HIGH"), false);
      },
    );
  });

  it("allows disclaimer wording and flags bare advice, returns, personal data, and election logistics", () => {
    withSite(
      {
        "ok.html": "<!DOCTYPE html><html><head><title>Ok</title></head><body><p>This page is not legal advice and not medical advice. Write editor@highermathguide.com.</p></body></html>\n",
      },
      (root) => {
        assert.deepEqual(runLegalGate({ root }).findings, []);
      },
    );
    withSite(
      {
        "bad.html": "<!DOCTYPE html><html><head><title>Bad</title></head><body><p>You should invest for a guaranteed return. Call 555-010-0199, email student@example.com, or visit 10 King Street. Check the polling place.</p></body></html>\n",
      },
      (root) => {
        const found = rules(root);
        assert.ok(found.includes("5"));
        assert.ok(found.includes("2"));
        assert.ok(found.includes("6"));
      },
    );
  });

  it("allows the legal page business address and holds a different street address", () => {
    BUSINESS_ADDRESSES.push("10 Market Street");
    try {
      withSite(
        {
          "terms/index.html": "<!DOCTYPE html><html><head><title>Terms</title></head><body><p>Office: 10 Market Street.</p></body></html>\n",
        },
        (root) => {
          assert.deepEqual(runLegalGate({ root }).findings, []);
        },
      );
      withSite(
        {
          "notes/index.html": "<!DOCTYPE html><html><head><title>Notes</title></head><body><p>Mail the packet to 10 King Street.</p></body></html>\n",
        },
        (root) => {
          assert.ok(rules(root).includes("2"));
        },
      );
    } finally {
      BUSINESS_ADDRESSES.pop();
    }
  });

  it("is a required step before the Pages artifact and the deploy job", () => {
    const yaml = fs.readFileSync(path.join(REPO, ".github/workflows/deploy-pages.yml"), "utf8");
    const gateAt = yaml.indexOf("run: node scripts/legal-gate.js");
    const uploadAt = yaml.indexOf("actions/upload-pages-artifact@v3");
    const deployAt = yaml.indexOf("actions/deploy-pages@v4");
    assert.ok(gateAt > 0, "workflow is missing the legal gate");
    assert.ok(uploadAt > gateAt, "legal gate must run before the Pages artifact upload");
    assert.ok(deployAt > uploadAt, "deploy must follow the artifact upload");
    assert.match(yaml, /needs:\s*build/);
    assert.equal(yaml.includes("continue-on-error"), false);
    assert.match(yaml, /--exclude 'tests\/'/);
    const config = fs.readFileSync(path.join(REPO, "_config.yml"), "utf8");
    assert.match(config, /^ {2}- tests$/m);
  });
});
