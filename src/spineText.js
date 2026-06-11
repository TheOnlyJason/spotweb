import * as THREE from "three";

const SPINE_FONT = '"Source Sans 3", system-ui, sans-serif';
const SPINE_LETTER_SPACING = 2;
const SPINE_TEX_HEIGHT = 4096;

export function spineCanvasSize(height, thickness) {
  const spineW = thickness * 0.76;
  const spineH = height * 0.94;
  const aspect = Math.max(0.09, Math.min(0.2, spineW / spineH));
  const h = SPINE_TEX_HEIGHT;
  const w = Math.max(384, Math.round(h * aspect));
  return { w, h };
}

function spineFontSize(label, canvasH) {
  const text = label.length > 22 ? label.slice(0, 21) : label;
  const max = Math.round(canvasH * 0.042);
  const min = Math.round(canvasH * 0.024);
  return Math.min(max, Math.max(min, Math.floor((canvasH * 0.45) / Math.max(text.length, 1))));
}

function configureSpineCtx(ctx) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.textRendering = "optimizeLegibility";
}

export function configureSpineTexture(map) {
  map.colorSpace = THREE.SRGBColorSpace;
  map.generateMipmaps = true;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.magFilter = THREE.LinearFilter;
  map.anisotropy = 8;
}

export function drawSpineEdgeStrip(ctx, w, h, edgeHex) {
  const edge = new THREE.Color(edgeHex);
  const grad = ctx.createLinearGradient(0, 0, w * 0.14, 0);
  grad.addColorStop(0, edge.clone().offsetHSL(0, 0, -0.12).getStyle());
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w * 0.14, h);
}

export function drawSpineBackground(ctx, w, h, tintHex) {
  ctx.fillStyle = tintHex;
  ctx.fillRect(0, 0, w, h);
}

export function drawSpineLabel(ctx, w, h, label, { flip = false } = {}) {
  if (!label) return;
  configureSpineCtx(ctx);

  const text = label.length > 22 ? `${label.slice(0, 21)}…` : label;
  const fontSize = spineFontSize(text, h);
  const font = `600 ${fontSize}px ${SPINE_FONT}`;

  ctx.save();
  const anchorX = w * 0.5;
  const anchorY = h * 0.38;
  ctx.translate(anchorX, anchorY);
  ctx.rotate(flip ? Math.PI / 2 : -Math.PI / 2);
  ctx.font = font;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  let advance = 0;
  for (const ch of text) {
    const kern = ctx.measureText(ch).width + SPINE_LETTER_SPACING;
    const x = Math.round(advance);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillText(ch, x + 1, 2);
    ctx.fillStyle = "rgba(248, 246, 242, 0.96)";
    ctx.fillText(ch, x, 0);
    advance += kern;
  }
  ctx.restore();
}

// Horizontal shelf strip (e.g. game box front): same type as spine, runs along the long edge.
export function stripCanvasSize(longEdge, shortEdge) {
  const canvasW = 1024;
  const canvasH = Math.max(200, Math.round(canvasW * (shortEdge / longEdge)));
  return { w: canvasW, h: canvasH };
}

export function drawStripLabel(ctx, w, h, label) {
  if (!label) return;
  configureSpineCtx(ctx);

  const text = label.length > 22 ? `${label.slice(0, 21)}…` : label;
  const fontSize = spineFontSize(text, w);
  const font = `600 ${fontSize}px ${SPINE_FONT}`;

  ctx.font = font;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  let advance = 0;
  for (const ch of text) {
    advance += ctx.measureText(ch).width + SPINE_LETTER_SPACING;
  }
  advance -= SPINE_LETTER_SPACING;

  let x = (w - advance) / 2;
  const y = h * 0.5;
  for (const ch of text) {
    const kern = ctx.measureText(ch).width + SPINE_LETTER_SPACING;
    const drawX = Math.round(x);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillText(ch, drawX + 1, y + 2);
    ctx.fillStyle = "rgba(248, 246, 242, 0.96)";
    ctx.fillText(ch, drawX, y);
    x += kern;
  }
}
