# Higher Math Guide

Static educational site for **Higher Math Guide**

Live site: https://highermathguide.com/  
GitHub Pages serves from the `main` branch root with a `CNAME` for the custom domain.  
Brand tagline: *Higher mathematics, explained without the fog.*  
Entity: Joshua Israel Ventures LLC

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
| `contact/` | Mailto contact form (`[Contact: Higher Math Guide]`) |
| `disclaimer/` | Educational disclaimer |
| `css/styles.css` | Shared styles (indigo accent) |
| `js/main.js` | Nav, contact mailto, calculators |
| `robots.txt` / `sitemap.xml` / `llms.txt` | Crawlers and AI summary |

## Notes

- Content is original educational prose. Not a substitute for courses or exams.
- No ads, affiliate links, or paid product funnels.
- GitHub Pages should serve from `main` branch root.
