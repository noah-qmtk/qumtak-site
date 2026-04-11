# Qumtak Soccer — Site Guide for Claude

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
| `public/logo.png` | Qumtak logo (128×128) used in nav + footer | Replacing logo |
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

## GitHub → Vercel Flow
Push to `main` → Vercel auto-detects → deploys in ~10s → live at qmtk.org  
No manual deploy steps needed.

## Vercel Project ID
`prj_eOrxnB4QGyINPyRpqeYyUgUhT0S3` (only needed for direct API calls, not for GitHub workflow)
