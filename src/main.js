import { site } from "./content.js";
import { createScene } from "./scene.js";
import { loadLinenTextures } from "./linenTextures.js";

const container = document.getElementById("canvas-container");
const app = document.getElementById("app");

if (!container || !app) {
  throw new Error("Missing #app or #canvas-container element");
}

const titleEl = document.querySelector(".logo span");
const taglineEl = document.getElementById("site-tagline");
if (titleEl) titleEl.textContent = site.siteTitle;
if (taglineEl) taglineEl.textContent = site.intro;

let sceneApi = null;
let setupPromise = null;

function hasSize() {
  return container.clientWidth > 0 && container.clientHeight > 0;
}

async function setupScene() {
  const linen = await loadLinenTextures().catch((err) => {
    console.warn("Linen textures unavailable, using procedural covers.", err);
    return null;
  });

  sceneApi = createScene(container, {
    books: site.sections,
    horizontalBooks: [
      {
        id: "intro",
        title: site.siteTitle,
        body: site.intro,
        color: site.sections[0]?.color ?? "#7e74c8",
      },
      {
        id: "selected",
        title: "Selected",
        body: site.sections[1]?.body ?? "Highlighted work and projects.",
        color: site.sections[1]?.color ?? "#c9887a",
      },
      {
        id: "index",
        title: "Index",
        body: site.sections.map((s) => s.title).join("\n"),
        color: site.sections[2]?.color ?? "#4fa892",
      },
    ],
    linen,
  });
}

function ensureScene() {
  if (sceneApi) {
    sceneApi.resize();
    return true;
  }
  if (!hasSize() || setupPromise) return false;

  setupPromise = setupScene();
  return false;
}

function animate() {
  requestAnimationFrame(animate);
  ensureScene();
  sceneApi?.render();
}

window.addEventListener("resize", () => sceneApi?.resize());

if (!ensureScene()) {
  const observer = new ResizeObserver(() => {
    if (ensureScene()) observer.disconnect();
  });
  observer.observe(container);
}

animate();
