# Rejinth R — Portfolio

A single-page, static portfolio site with a light theme. Plain HTML, CSS and JavaScript: no framework, no build step, no server.

```
portfolio/
├── index.html                 All content
├── css/style.css              Design tokens and all styles
├── js/script.js               Mobile menu, nav highlight, hero dot animation, copyright year
└── assets/
    ├── Rejinth-R-Resume.pdf   Downloadable résumé (copied from the profile repo)
    └── images/
        ├── favicon.svg        Browser-tab icon
        └── og-image.png       1200×630 preview image for social shares
```

The only external requests are Google Fonts (Manrope and JetBrains Mono). If the fonts can't load, the page falls back to system fonts.

## Sections

1. **Hero**: your email at the top, the dot-matrix word animation, the headline and the calls to action.
2. **Why work with me**: "Low Cost. Never Low Quality." with four selling points.
3. **Services**: web, mobile web and native mobile applications.
4. **Selected Work**: DeployHub, CodeAudit and DIGIPIN Service.
5. **Tech Stack**: one row per category.
6. **Process**: five steps from idea to delivery.

There's no contact form. Every "Let's Talk", "Get a Quote" and "Discuss Your Project" button opens an email to you, with the subject already filled in.

---

## Running locally

Double-click `index.html` to open it in any modern browser. To serve it instead:

```bash
cd portfolio
python -m http.server 8000
# then open http://localhost:8000
```

---

## Customizing

Every place that needs your attention is marked with a `CUSTOMIZE:` comment. Search `index.html` for `CUSTOMIZE` to find them all.

| What | Where |
| --- | --- |
| **Email address** | The `.hero-email` link at the top of the hero, plus every `mailto:` link (nav "Let's Talk", "Get a Quote", the three "Discuss Your Project" buttons). Find and replace `rejinthdeveloper@gmail.com` to change them all at once. |
| **Animated words** | The `data-dot-words` attribute on the `<canvas>` in the hero, separated by `\|`: `LOW COST\|TOP QUALITY\|WEB APPS\|MOBILE APPS`. Short words in capitals read best. Every word is drawn at the same size, fitted to the longest one, so very long words make all of them smaller. |
| **Animation colors** | `--dot-from` (rose) and `--dot-to` (teal) in `:root` in `css/style.css`. Use six-digit hex values. |
| **Animation timing** | `CYCLE_MS` (time per word), `SPRING` and `FRICTION` (how the dots move) at the top of `initDotWords()` in `js/script.js`. |
| **Selling points** | `<ul class="value-grid">` in `index.html`. The first card (`value-card--feature`) is the highlighted teal one with the cost/quality meter. |
| **Name / brand** | `.brand` in the header and footer (the monogram is the `RR` in `.brand-mark`), plus `<title>`, the `og:` tags and the JSON-LD block in `<head>`. |
| **Projects** | `<article class="project-card">`. Copy a card to add one. The comment above the grid shows how to add optional **View project** / **View case study** links, or swap the CSS preview for a real screenshot. |
| **Technologies** | `<dl class="stack-list">`. One `.stack-row` per category. |
| **Native mobile framework** | Two placeholders: "Framework chosen per project." in the Native card, and the dashed `tag--pending` tag in the Mobile stack row. |
| **Profile links** | Footer `.footer-links`. Add LinkedIn as another `<li>` when ready. |
| **Canonical / share URLs** | `canonical`, `og:url` and `og:image` in `<head>`. These must be absolute URLs on the address where the site is published. |
| **Colors, type, spacing** | `:root` at the top of `css/style.css`. Every color, font, size, radius and duration is a custom property. |

### About the animation

- It's decorative and hidden from screen readers. The headline below carries the message.
- With **reduced motion** turned on in the visitor's OS, the first word is drawn once, with no movement or cycling.
- It pauses when scrolled off-screen or in a background tab, and stops drawing once the dots have settled, so it doesn't drain battery while idle.
- With JavaScript off, a plain text version ("Low cost · Top quality") shows in its place.
- Moving a mouse over it gently pushes the dots aside. Touch scrolling isn't affected.

---

## Deploying

The site is plain static files, so it runs on GitHub Pages, Netlify, Cloudflare Pages or any web host. To replace the current GitHub Pages site, copy the contents of this folder into the root of the `profile` repository, update the canonical and `og:` URLs if the address changes, then commit and push.

---

## What was tested

Checked in headless Chrome (desktop Chrome engine):

- Layouts at 320, 390, 768, 1024, 1440 and 1920 px wide: no horizontal page overflow and no clipped content.
- No JavaScript errors or failed resource loads.
- Animation: dots assemble into each word and morph to the next. Reduced-motion mode draws one still word. The no-JavaScript fallback text appears.
- Mobile menu: opens and closes, Escape closes it and returns focus to the button, and `aria-expanded` stays in sync.
- With JavaScript disabled, content renders and the navigation stays usable as a scrollable row.

Not yet done: a Lighthouse audit, testing in Safari/Firefox or on real devices, and a screen-reader pass.
