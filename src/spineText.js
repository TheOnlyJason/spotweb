import * as THREE from "three";

const SPINE_LETTER_SPACING = 3;

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

export function drawSpineLabelHorizontal(ctx, w, h, label) {
  const text = label.length > 28 ? `${label.slice(0, 27)}…` : label;
  const fontSize = Math.min(72, Math.max(36, Math.floor(w * 0.9 / text.length)));
  const font = `600 ${fontSize}px "Inter", "Montserrat", system-ui, -apple-system, sans-serif`;

  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.fillText(text, w / 2 + 1, h / 2 + 2);
  ctx.fillStyle = "rgba(248, 246, 242, 0.95)";
  ctx.fillText(text, w / 2, h / 2);
}

export function drawSpineLabel(ctx, w, h, label, { flip = false } = {}) {
  const text = label.length > 22 ? `${label.slice(0, 21)}…` : label;
  const fontSize = Math.min(88, Math.max(52, Math.floor(920 / text.length)));
  const font = `600 ${fontSize}px "Inter", "Montserrat", system-ui, -apple-system, sans-serif`;

  ctx.save();
  const anchorX = w * 0.62;
  const anchorY = h * 0.38;
  ctx.translate(anchorX, anchorY);
  ctx.rotate(flip ? Math.PI / 2 : -Math.PI / 2);
  ctx.font = font;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  let advance = 0;
  for (const ch of text) {
    const kern = ctx.measureText(ch).width + SPINE_LETTER_SPACING;
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.fillText(ch, advance + 1, 2);
    ctx.fillStyle = "rgba(248, 246, 242, 0.95)";
    ctx.fillText(ch, advance, 0);
    advance += kern;
  }
  ctx.restore();
}
