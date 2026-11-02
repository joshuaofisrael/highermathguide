# Higher Math Guide

Static educational site for **Higher Math Guide**

Live site: https://highermathguide.com/  
GitHub Pages serves from the `main` branch root with a `CNAME` for the custom domain.  
Brand tagline: *Higher mathematics, explained without the fog.*  
Legal entity: named on the terms, privacy, disclaimer, and copyright pages.

## Local preview

```bash
cd /path/to/highermathguide
python3 -m http.server 8080
```

Open http://127.0.0.1:8080/

No build step is required. HTML, CSS, and JS are ready to serve as-is. KaTeX loads from CDN on pages that need math rendering.

## Legal hold gate

`node scripts/legal-gate.js` scans pages before GitHub Pages deploy. A failure exits 1, writes `hold-queue.jsonl`, and the deploy workflow does not upload the site. `node --test tests/legal-gate.test.js` checks a hold fixture and a passing fixture. Those fixtures live under `tests/fixtures/legal-gate/` and are not part of the published site.

## IndexNow

After a successful deploy from `main`, `node scripts/indexnow-ping.js` POSTs the sitemap and any changed page URLs to the [IndexNow](https://www.indexnow.org/) API using the key file at the site root (`45e97950d9eb472c8e370ccafe218e5c.txt`). It is best effort: a non-200/202 response or a network error is logged but never fails the workflow. Run it locally with `node scripts/indexnow-ping.js --dry-run` to preview the URL list without sending it.

## Structure

| Path | Purpose |
|------|---------|
| `index.html` | Home, Start here strip |
| `about/` | Mission, original content policy, publisher |
| `faq/` | Learner questions and contact expectations |
| `topics/` | Index + 6 pillar articles |
| `explainers/` | Index + original long form explainers (Article JSON-LD) |
| `glossary/` | Core terms with anchors |
| `pathways/` | AP Calc AB bridge; linear algebra; intro to proofs |
| `calculators/` | Index + browser tools |
| `sources/` | Outbound reference directory |
| `contact/` | Contact form posted to FormSubmit (`[Contact: highermathguide.com] New message`) |
| `disclaimer/` | Educational disclaimer |
| `css/styles.css` | Shared styles (indigo accent) |
| `js/main.js` | Nav and calculators |
| `robots.txt` / `sitemap.xml` / `llms.txt` | Crawlers and AI summary |

## Notes

- Content is original educational prose. Not a substitute for courses or exams.
- The site may show Google AdSense ads. Affiliate links are not used now. The disclaimer says they may be added later. There is no paid product to buy.
- GitHub Pages should serve from `main` branch root.
