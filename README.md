# Virtual-portfolio3.0

This is where i experiment on making my own portfolio website.

https://borobhairion.github.io/Virtual-portfolio3.0/

## Project structure

The site is organised as an MVC-style application. Pages live in `views/`, static
files live in `public/`, and the `controllers` / `models` / `routes` / `config`
folders are the scaffolding for the Express + Supabase layer (not wired up yet).

```
config/                 Environment + client setup (Supabase)
controllers/            Request handlers that render views
models/                 Data access layer (Supabase tables)
routes/                 URL -> controller mapping
views/                  Page templates (EJS)
  partials/             Shared head, navbar, preloader, footer
  index.ejs             Home page
  about.ejs             About page
  works.ejs             Works / projects page (projects table)
  linefollower.ejs      Line follower project page
  loading.ejs           Standalone splash screen
  404.ejs               Apache-style not-found page -> dist/404.html
public/                 Static files, copied to the build as-is
  assets/               Images (projects/ holds project screenshots)
  css/
    input.css           Tailwind entry point
    style.css           Retro theme (CSS variables, light + dark)
    site.css            Generated stylesheet (git-ignored)
  js/
    theme.js            Theme controller (switch, persistence, shortcut)
    retro.js            Effects layer (cursor, scramble, glitch, reveals, ...)
    palette.js          Ctrl/Cmd+K command palette
    loading.js          Splash screen behaviour
scripts/build-views.js  Renders views/ -> dist/
scripts/serve.js        Static preview of dist/ with the host redirects
scripts/verify.js       HTTP regression checks (content, routing, 404s)
scripts/render-audit.js Headless-Chrome checks (scroll, layout, a11y, themes)
server.js               Dev server for views/ (npm run serve:dev)
docs/                   Project write-ups
dist/                   Generated static site (git-ignored)
```

## Building

```bash
npm install
npm run build        # build:css, then build:html
npm run build:css    # compiles Tailwind -> public/css/site.css
npm run build:html   # renders views/*.ejs -> dist/*.html and copies public/
```

Tailwind is compiled locally with `@tailwindcss/cli`, so the deployed site ships a
small static stylesheet instead of downloading the development CDN script and
building the CSS in the browser.

### Previewing

```bash
npm run serve           # dist/ on http://localhost:4173 (same behaviour as the hosts)
npm run serve:dev       # Express server for views/ on http://localhost:3000
```

`scripts/serve.js` mirrors what Netlify and Vercel do with `dist/`: `/` always
serves the home page, `/index.html` and the other extensionless aliases redirect
to it, and unknown paths return `dist/404.html` with a real 404 status.

### Verifying

```bash
npm run verify          # HTTP checks: content and section order, aliases, 404s
npm run verify:render   # browser checks: scroll position, scroll reveals,
                        # responsive widths, reduced motion, JS disabled,
                        # theme contrast, images
npm run verify:all      # both of the above
npm test                # same as verify
```

`verify` is dependency-free. `verify:render` drives headless Chrome over the
DevTools protocol against the built site; set `CHROME_PATH` if the browser is
not in a known location, and the run reports a skip when none is found.

### Deployment

Netlify and Vercel configs are included (`netlify.toml`, `vercel.json`); both run
`npm run build` and publish `dist/`.

## Database (Supabase) — planned

`config/supabase.js` and `models/` are ready for Supabase. To enable it:

1. Add credentials to a local `.env` file (never commit these):

   ```
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_ANON_KEY=<anon-public-key>
   ```

2. Install the client: `npm install @supabase/supabase-js`

Suggested tables (`works`, `messages`) are documented in `models/index.js`.

## Notes

- The site is a "fake 1996 page" on top of a 2026 experience. Content is plain
  semantic HTML and stays readable with JavaScript disabled; the effects in
  `public/js/retro.js` are layered on progressively and are skipped entirely
  for `prefers-reduced-motion` visitors and on touch devices.
- Light mode is the default "Netscape" look and dark mode a "night terminal".
  The choice comes from `prefers-color-scheme`, is remembered in
  `localStorage`, and is applied by the inline script in `partials/head.ejs`
  before first paint so there is no flash of the wrong theme.
- Colours are CSS custom properties (`--bg`, `--text`, `--link`, `--accent`, …),
  so the cursor, scanlines, glitch and accent all follow the active theme.
- Fonts are system fonts only. The lone third-party script (Lenis, for smooth
  scrolling) is fetched on demand after load and is never required — the CSS
  `scroll-behavior: smooth` fallback covers every other case.
- The old root-level `.html` files, `styles/`, `scripts/` and `new project/`
  folders were replaced by the layout above.
