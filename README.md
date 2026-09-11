# Higher Math Guide

Static educational site for **Higher Math Guide**  
Live (GitHub Pages): https://joshuaofisrael.github.io/highermathguide/  
Planned domain: highermathguide.com (not configured yet — no CNAME in repo)  
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
| `index.html` | Home |
| `topics/` | Index + 6 pillar articles |
| `explainers/` | Index + 6 long-form explainers (Article JSON-LD) |
| `glossary/` | ~30 terms with anchors |
| `pathways/` | AP Calc AB bridge; linear algebra; intro to proofs |
| `calculators/` | Index + numerical derivative / slope estimator |
| `sources/` | Outbound reference directory |
| `contact/` | Mailto contact form (`[Contact: Higher Math Guide]`) |
| `disclaimer/` | Educational disclaimer |
| `css/styles.css` | Shared styles (indigo accent) |
| `js/main.js` | Nav, contact mailto, calculator |
| `robots.txt` / `sitemap.xml` / `llms.txt` | Crawlers & AI summary |

## Notes

- Content is original educational prose. Not a substitute for courses or exams.
- Do not add a `CNAME` until highermathguide.com DNS is ready.
- GitHub Pages should serve from `main` branch root.
