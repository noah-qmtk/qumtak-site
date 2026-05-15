# qmtk Soccer — Site Guide for Claude

## Stack
Pure static HTML/CSS/JS. No framework, no build step.  
Vercel auto-deploys on every push to `main`.  
Live at: **qmtk.org**

## File Map
| File | What it controls | Edit when... |
|------|-----------------|--------------|
| `public/index.html` | Page structure, all HTML content, section order | Adding/removing sections, changing text, adding new elements |
| `public/style.css` | All styling — layout, colors, fonts, responsive breakpoints | Changing appearance, spacing, colors, mobile behavior |
| `public/main.js` | All JavaScript — survey popup, scroll animations, card toggles | Adding interactivity, changing popup behavior, new animations |
| `public/logo.png` | qmtk logo (128×128) used in nav + footer | Replacing logo |
| `public/hero.jpg` | Hero section photo (1200×1600 portrait) | Replacing hero image |
| `public/ac-team.jpg` | Card 01 — AC Arlington (900×1949 portrait) | Replacing image |
| `public/monchengladbach.jpg` | Card 02 — Mönchengladbach (700×900 portrait) | Replacing image |
| `public/klosterhardt.jpg` | Card 03 — Klosterhardt team (1200×700 landscape) | Replacing image |
| `public/resume.pdf` | Shaya's coaching resume | Replacing resume |
| `vercel.json` | Vercel config — output dir = public | Almost never |

## CSS Architecture (style.css)
Key CSS variables at the top (`:root`): `--green`, `--bg`, `--bg-card`, `--text`, etc.  
Section order mirrors HTML order:
1. Reset & variables
2. Nav
3. Hero
4. Stats bar
5. Journey / career cards (`.journey-card`, `.journey-photo`, `.journey-body`)
6. Photo gallery
7. Programs
8. Testimonial
9. Partnership / AD section
10. CTA
11. LinkedIn embed
12. Footer
13. **Scroll animations** (`.reveal`, `.reveal-left`, `.reveal-scale`, delays)
14. **Hover enhancements** (journey cards, prog cards, nav, buttons)
15. **Survey popup** (`#survey-overlay`, `#survey-modal`, `#survey-close-btn`)
16. Media queries (`@media max-width: 960px`, `640px`, `400px`)

## JS Architecture (main.js)
- `toggleJourney(card)` — opens/closes career cards
- `toggleExpand(trigger)` — used in programs section
- `openSurvey()` / `closeSurvey()` — survey popup
- Backdrop click to close survey
- Auto-open survey after 8s (once per session via `sessionStorage`)
- `IntersectionObserver` — drives all `.reveal` scroll animations

## Survey
Embedded Microsoft Forms iframe.  
Form URL: `https://forms.office.com/Pages/ResponsePage.aspx?id=u043c25KjkacSleRk_tGx5BszrBmq8BOpuVcDeLw_idUOVBYWUk4NkNDOVBaNDdBMUw0VzQ5WDk0Ny4u&embed=true`  
To swap form: find the `src=` in `#survey-modal iframe` in `index.html`.

## Color Palette
- `--green: #22a24d` — primary green
- `--bg: #0a0f0c` — page background
- `--bg-card: #111810` — card background
- `--bg-raised: #161d13` — hovered card
- `--gold: #f0a500` — used on coaching badge

## Efficient Edit Patterns
- **Text change only** → edit `index.html` only (1 file push)
- **Style change only** → edit `style.css` only (1 file push)
- **New interaction/animation** → edit `main.js` only (1 file push)
- **New section** → edit `index.html` + `style.css` (2 file push)
- **Image swap** → push new image file only

## Weekly Training Plans (auto-rotating)
The `#sessions` block on the homepage shows a different plan each week, auto-selected by today's date. Source of truth: `public/training-plans.json`.

**To update a week's plan:**
1. Edit the relevant entry in `public/training-plans.json` (each `weekOf` is a Monday). Fields per drill: `time`, `tag` (Opening Game / Lesson 1 / Lesson 2 / Scrimmage), `title`, `space`, `desc`, `focus[]`.
2. Regenerate the coach PowerPoints: `python3 scripts/generate_pptx.py` (writes `public/plans/<weekOf>.pptx`, one per week).
3. Commit + push. Vercel deploys automatically.

The site picks the latest week whose `weekOf` is on or before today. The "Download Coach's PowerPoint" button at the bottom of the section points to `/plans/<weekOf>.pptx` for the current week.

`scripts/generate_pptx.py` requires `python-pptx` (`pip3 install --user python-pptx`).

## Embedded Card Checkout (`/api/checkout` + Web Payments SDK)
The `/buy/?p=<product>` pages embed Square's Web Payments SDK card form directly on qmtk.org. No redirect — customer enters card on our domain.

Flow:
1. `/buy/` page loads Square Web Payments SDK (`web.squarecdn.com/v1/square.js` or sandbox equivalent)
2. SDK tokenizes the card client-side → returns a one-time `source_id` token
3. Browser POSTs `{ source_id, product_key, buyer_email_address }` to `/api/checkout`
4. Serverless function (`api/checkout.js`) calls Square `/v2/payments` with the token + server-side product price
5. On success, page swaps to in-line "You're in" success state with receipt link

Required Vercel environment variables (Settings → Environment Variables):
- `SQUARE_ACCESS_TOKEN` — production Personal Access Token
- `SQUARE_LOCATION_ID` — e.g. `L2TKVGY8K0CVH`
- `SQUARE_ENV` — `production` or `sandbox`

Public client-side identifiers (in `public/buy/index.html`):
- Sandbox App ID: `sandbox-sq0idb-ZTHHrrck2shrdEx1zqabZA`
- Production App ID: `sq0idp-yaRqgCyyyNwODi6723EH8w`

Prices are hardcoded in `api/checkout.js` for server-side trust — never trust client-supplied prices.

## Branded Buy Pages (`/buy/`)
All Square checkout flows on the site go through `/buy/?p=<product_key>` first — a fully qmtk-branded interstitial page (`public/buy/index.html`). The page reads `?p=` from the URL, fetches `public/square-products.json`, finds the matching product, and renders product-specific copy from the inline `COPY` map (eyebrow / title / sub / features / steps).

The big green CTA on `/buy/` is the actual `square.link/u/...` URL. That keeps the customer in qmtk branding through 90% of the funnel — they only hit Square's hosted page for the 15-second card-entry step.

When the customer completes payment, Square redirects to `qmtk.org/?purchase=success`, which triggers a thank-you modal on the homepage (see `#thanks-overlay`).

To edit a product's pitch (features, "what happens next" steps, headline), edit the `COPY` object in `public/buy/index.html`. To change the price or which item is sold, run `setup_square.py` — the JSON updates and `/buy/` picks it up automatically.

## Square Pricing & Checkout
The `#pricing` section on the homepage is data-driven from `public/square-products.json`. The site renders three package cards (1, 5, 10 sessions) plus a gift-card strip with Buy Now buttons that link to Square Checkout URLs.

**To update prices or add products:**
1. Edit `PRODUCTS` in `scripts/setup_square.py`
2. Run with your Square Personal Access Token:
   ```bash
   SQUARE_ENV=sandbox SQUARE_ACCESS_TOKEN=EAAA... python3 scripts/setup_square.py     # test
   SQUARE_ENV=production SQUARE_ACCESS_TOKEN=EAAA... python3 scripts/setup_square.py  # live
   ```
3. The script creates Square catalog items + payment links and writes `public/square-products.json`. Commit + push.

When `env === "sandbox"` in the JSON, the site shows a yellow "🧪 Test mode" banner so visitors know payments won't charge. Switch to production token + re-run to remove it.

Token is never stored in the repo — it lives only in your shell env when you run the script.

## GitHub → Vercel Flow
Push to `main` → Vercel auto-detects → deploys in ~10s → live at qmtk.org  
No manual deploy steps needed.

## Vercel Project ID
`prj_eOrxnB4QGyINPyRpqeYyUgUhT0S3` (only needed for direct API calls, not for GitHub workflow)
