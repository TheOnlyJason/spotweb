import * as THREE from "three";
import {
  drawSpineBackground,
  drawSpineLabel,
  spineCanvasSize,
  configureSpineTexture,
} from "./spineText.js";
import { softenColor } from "./colors.js";

const BASE = "/textures/linen/";
const DEFAULT_SPINE_HEIGHT = 1.02;
const DEFAULT_SPINE_THICKNESS = 0.13;
let loadPromise = null;

function loadImageTexture(loader, url, { colorSpace } = {}) {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (tex) => {
        if (colorSpace !== undefined) tex.colorSpace = colorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.anisotropy = 2;
        resolve(tex);
      },
      undefined,
      reject
    );
  });
}

export function loadLinenTextures() {
  if (!loadPromise) {
    const loader = new THREE.TextureLoader();
    loadPromise = Promise.all([
      loadImageTexture(loader, `${BASE}diff.jpg`, { colorSpace: THREE.SRGBColorSpace }),
      loadImageTexture(loader, `${BASE}normal.png`, { colorSpace: THREE.NoColorSpace }),
      loadImageTexture(loader, `${BASE}roughness.png`, { colorSpace: THREE.NoColorSpace }),
    ]).then(([map, normalMap, roughnessMap]) => ({ map, normalMap, roughnessMap }));
  }
  return loadPromise;
}

function applyRepeat(tex, u, v) {
  const t = tex.clone();
  t.repeat.set(u, v);
  t.needsUpdate = true;
  return t;
}

export function createLinenCoverMaterial(linen, tintColor, repeat = [1.4, 1.8]) {
  const tint = softenColor(tintColor);
  const mat = new THREE.MeshLambertMaterial({
    map: applyRepeat(linen.map, repeat[0], repeat[1]),
    color: new THREE.Color(tint),
  });
  mat.emissive = new THREE.Color(0x000000);
  return mat;
}

export function createLinenSpineMaterial(
  linen,
  tintColor,
  label,
  { flipLabel = false, height = DEFAULT_SPINE_HEIGHT, thickness = DEFAULT_SPINE_THICKNESS } = {}
) {
  const tint = softenColor(tintColor);
  const { w, h } = spineCanvasSize(height, thickness);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  const linenImage = linen.map.image;
  if (linenImage) {
    const pattern = ctx.createPattern(linenImage, "repeat");
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = tint;
    ctx.globalCompositeOperation = "multiply";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  } else {
    drawSpineBackground(ctx, w, h, tint);
  }

  drawSpineLabel(ctx, w, h, label, { flip: flipLabel });

  const map = new THREE.CanvasTexture(canvas);
  configureSpineTexture(map);

  const mat = new THREE.MeshLambertMaterial({ map });
  mat.emissive = new THREE.Color(0x000000);
  return mat;
}
