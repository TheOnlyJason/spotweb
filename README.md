# SpotWeb

A 3D bookshelf portfolio: each book is a section of your site, defined in `jason.md`.

Live site: [jasonneverdai.com](https://jasonneverdai.com)

## Deploy (Cloudflare Pages)

This is a static Vite site — no server, env vars, or database required.

### 1. Point the domain to Cloudflare (GoDaddy)

In **GoDaddy → Domain → DNS → Nameservers**, choose custom nameservers and set:

1. `hank.ns.cloudflare.com`
2. `khloe.ns.cloudflare.com`

Remove the old GoDaddy nameservers (`ns63.domaincontrol.com`, `ns64.domaincontrol.com`). Save, then click **Continue** in Cloudflare. Propagation can take a few minutes up to 24 hours.

### 2. Create the Pages project

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Select **`TheOnlyJason/spotweb`** (push latest `main` first if needed)
3. Build settings:

| Setting | Value |
|---------|--------|
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | `22` (Settings → Environment variables → `NODE_VERSION` = `22`) |

4. **Save and Deploy**

Use **`npm run build`** only — do not set the build command to `wrangler deploy` or `npm run deploy`. This project is static HTML/JS; Pages serves the `dist/` folder after Vite builds.

### 3. Attach your domain

After the first deploy succeeds:

1. Pages project → **Custom domains** → **Set up a custom domain**
2. Add `jasonneverdai.com` and optionally `www.jasonneverdai.com`
3. Cloudflare creates the DNS records automatically (domain must use Cloudflare nameservers from step 1)

### 4. Verify

- `https://jasonneverdai.com` loads the bookshelf
- Books, photos (`/jason.jpg`, `/adventures/…`), and project links work
- Every push to `main` triggers a new production deploy

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
