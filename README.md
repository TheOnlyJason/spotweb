# SpotWeb

A 3D bookshelf portfolio: each book is a section of your site, defined in `jason.md`.

Live site: [jasonneverdai.com](https://jasonneverdai.com)

## Deploy (GitHub Pages)

1. Push to `main` on GitHub — the [deploy workflow](.github/workflows/deploy-pages.yml) builds `dist/` and publishes automatically.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Custom domain: **Settings → Pages → Custom domain** → enter `jasonneverdai.com` (matches `public/CNAME`).
4. At your registrar, point DNS to GitHub:
   - **Apex** `@` → A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - **www** (optional) → CNAME `www` → `theonlyjason.github.io`
5. Enable **Enforce HTTPS** once DNS verifies.

## Run

```bash
npm install
npm run dev
```

## Content

Edit `jason.md`:

- `# Title` — site name (header)
- Intro paragraphs under the title — tagline under the logo
- `## Section name` — one book per section; body text shows in the panel when clicked

## Controls

- **Hover** — book slides out slightly
- **Click** — book pulls out and opens its section panel
- **Click again** or **×** — close and return the book to the shelf

## Project layout

```
jason.md          — site copy (sections = books)
src/
  main.js         — entry point
  content.js      — loads and parses jason.md
  scene.js        — scene, camera, lights
  book.js         — book mesh + spine labels
  linenTextures.js — Poly Haven rough linen PBR maps
  bookshelf.js    — book stack + interaction
public/textures/linen/ — diff, normal, roughness (1K exports)
  sectionPanel.js — section overlay UI
  style.css
```
