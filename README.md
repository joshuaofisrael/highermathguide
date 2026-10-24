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
