# SpotWeb

A 3D bookshelf portfolio: each book is a section of your site, defined in `jason.md`.

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
