import { site } from "./content.js";
import { createScene } from "./scene.js";
import { loadLinenTextures } from "./linenTextures.js";

const container = document.getElementById("canvas-container");
const app = document.getElementById("app");

if (!container || !app) {
  throw new Error("Missing #app or #canvas-container element");
}

let sceneApi = null;
let setupPromise = null;

function hasSize() {
  return container.clientWidth > 0 && container.clientHeight > 0;
}

async function setupScene() {
  await Promise.all([
    document.fonts.load('600 52px "Source Sans 3"'),
    document.fonts.load('400 26px "Source Serif 4"'),
  ]).catch(() => {});

  const linen = await loadLinenTextures().catch((err) => {
    console.warn("Linen textures unavailable, using procedural covers.", err);
    return null;
  });

  // Contact lives in jason.md but is not shown as its own book on the shelf.
  const shelfBooks = site.sections.filter((s) => s.id !== "contact");

  sceneApi = createScene(container, {
    books: shelfBooks,
    horizontalBooks: [
      {
        id: "intro",
        title: site.siteTitle,
        body: site.intro,
        color: site.sections[0]?.color ?? "#7e74c8",
        photo: "/jason.jpg",
      },
      {
        id: "games",
        title: "Games",
        body: "Games I've built — pull out the box and open the lid to browse them.",
        color: site.sections[1]?.color ?? "#c9887a",
      },
      {
        id: "adventures",
        title: "Adventures",
        body: "Stories from the road — open the book to read them.",
        color: site.sections[2]?.color ?? "#4fa892",
      },
    ],
    linen,
    badgePhoto: "/jason.jpg",
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
